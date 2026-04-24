/**
 * ============================================================
 * handler.ts — PS1-GAME スコアランキング用 Lambda ハンドラ
 * ============================================================
 *
 * API Gateway (REST) + Lambda + DynamoDB で構成される
 * スコアランキングバックエンド。
 *
 * サポートするエンドポイント:
 *   POST /scores       … スコアを記録
 *   GET  /scores/top   … ランキング上位 N 件を取得
 *
 * DynamoDB のスキーマは lambda/DYNAMODB.md を参照。
 * ============================================================
 */

import type {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

// ------------------------------------------------------------
// クライアント初期化
// ------------------------------------------------------------

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME ?? "ps1-game-scores";
const GSI_NAME = process.env.GSI_NAME ?? "cleartim-index";

// GSI のパーティションキーは全レコードで共通（単一パーティションに集約）
const GSI_PARTITION = "leaderboard";

// ランキング取得時のデフォルト・最大件数
const DEFAULT_TOP_LIMIT = 10;
const MAX_TOP_LIMIT = 100;

// ------------------------------------------------------------
// 型定義
// ------------------------------------------------------------

/** POST /scores のリクエストボディ */
interface ScorePostBody {
    user_id: string;
    cleartime: number;
    score?: number;
}

/** DynamoDB に保存する 1 レコード */
interface ScoreRecord {
    user_id: string;
    record_id: string;
    cleartime: number;
    score: number;
    timestamp: string;
    gsi_partition: string;
}

/** ランキング応答の 1 エントリ */
interface TopRecord {
    user_id: string;
    cleartime: number;
    score: number;
    timestamp: string;
}

// ------------------------------------------------------------
// エラー型
// ------------------------------------------------------------

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

// ------------------------------------------------------------
// バリデーション
// ------------------------------------------------------------

/**
 * POST /scores のリクエストボディをパース・検証する。
 *
 * @param body - API Gateway から渡される生のボディ文字列
 * @returns 検証済みの ScorePostBody
 * @throws ValidationError 形式不正時
 */
function parseScorePostBody(body: string | null): ScorePostBody {
    if (!body) {
        throw new ValidationError("Request body is empty");
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(body);
    } catch {
        throw new ValidationError("Request body is not valid JSON");
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new ValidationError("Request body must be a JSON object");
    }

    const { user_id, cleartime, score } = parsed as Record<string, unknown>;

    if (typeof user_id !== "string" || user_id.length === 0 || user_id.length > 64) {
        throw new ValidationError("user_id must be a non-empty string (max 64 chars)");
    }
    if (typeof cleartime !== "number" || !Number.isFinite(cleartime) || cleartime < 0) {
        throw new ValidationError("cleartime must be a finite non-negative number");
    }
    if (score !== undefined && (typeof score !== "number" || !Number.isFinite(score))) {
        throw new ValidationError("score must be a finite number when provided");
    }

    return {
        user_id,
        cleartime,
        score: typeof score === "number" ? score : undefined,
    };
}

/**
 * GET /scores/top のクエリストリングから limit を取り出す。
 * 未指定時は DEFAULT_TOP_LIMIT を返す。
 */
function parseTopLimit(qs: APIGatewayProxyEvent["queryStringParameters"]): number {
    const raw = qs?.limit;
    if (raw === undefined || raw === null || raw === "") {
        return DEFAULT_TOP_LIMIT;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
        throw new ValidationError("limit must be a positive number");
    }
    return Math.min(Math.floor(n), MAX_TOP_LIMIT);
}

// ------------------------------------------------------------
// DynamoDB 操作
// ------------------------------------------------------------

/**
 * スコアを 1 件書き込む。record_id は自動採番。
 * @returns 生成された record_id
 */
async function writeScore(input: ScorePostBody): Promise<string> {
    const recordId = randomUUID();
    const record: ScoreRecord = {
        user_id: input.user_id,
        record_id: recordId,
        cleartime: input.cleartime,
        score: input.score ?? 0,
        timestamp: new Date().toISOString(),
        gsi_partition: GSI_PARTITION,
    };

    await dynamo.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: record,
        })
    );

    return recordId;
}

/**
 * ランキング上位を取得する。cleartime 昇順（短いほど上位）。
 */
async function queryTopRecords(limit: number): Promise<TopRecord[]> {
    const result = await dynamo.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: GSI_NAME,
            KeyConditionExpression: "gsi_partition = :p",
            ExpressionAttributeValues: {
                ":p": GSI_PARTITION,
            },
            ScanIndexForward: true, // cleartime 昇順
            Limit: limit,
        })
    );

    const items = (result.Items ?? []) as ScoreRecord[];
    return items.map((it) => ({
        user_id: it.user_id,
        cleartime: it.cleartime,
        score: it.score,
        timestamp: it.timestamp,
    }));
}

// ------------------------------------------------------------
// HTTP レスポンスヘルパ
// ------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

function ok(body: unknown): APIGatewayProxyResult {
    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify(body),
    };
}

function clientError(message: string, statusCode = 400): APIGatewayProxyResult {
    return {
        statusCode,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify({ error: message }),
    };
}

function serverError(message: string): APIGatewayProxyResult {
    return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify({ error: message }),
    };
}

// ------------------------------------------------------------
// エントリポイント
// ------------------------------------------------------------

export async function handler(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod.toUpperCase();
    const path = event.path;

    // CORS プリフライト
    if (method === "OPTIONS") {
        return { statusCode: 204, headers: CORS_HEADERS, body: "" };
    }

    try {
        if (method === "POST" && path.endsWith("/scores")) {
            const body = parseScorePostBody(event.body);
            const recordId = await writeScore(body);
            return ok({ record_id: recordId });
        }

        if (method === "GET" && path.endsWith("/scores/top")) {
            const limit = parseTopLimit(event.queryStringParameters);
            const records = await queryTopRecords(limit);
            return ok({ records });
        }

        return clientError(`Not Found: ${method} ${path}`, 404);
    } catch (err) {
        if (err instanceof ValidationError) {
            return clientError(err.message, 400);
        }
        console.error("Unhandled error:", err);
        return serverError("Internal Server Error");
    }
}
