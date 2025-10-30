import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Grid } from "@react-three/drei";
import * as THREE from "three";

// 壁の衝突判定用のデータ
const walls = [
  // 外壁
  { position: [0, 1.5, -10], rotation: [0, 0, 0], scale: [20, 3, 0.2] },
  { position: [0, 1.5, 10], rotation: [0, 0, 0], scale: [20, 3, 0.2] },
  { position: [-10, 1.5, 0], rotation: [0, Math.PI / 2, 0], scale: [20, 3, 0.2] },
  { position: [10, 1.5, 0], rotation: [0, Math.PI / 2, 0], scale: [20, 3, 0.2] },
  // 内部の壁
  { position: [-5, 1.5, 0], rotation: [0, Math.PI / 2, 0], scale: [10, 3, 0.2] },
  { position: [5, 1.5, -5], rotation: [0, 0, 0], scale: [10, 3, 0.2] },
];

const boxes = [
  { position: [3, 0.5, 3], scale: [2, 1, 2] },
  { position: [-6, 0.5, -6], scale: [1.5, 1, 1.5] },
];

// 壁との衝突判定
function checkWallCollision(position, radius = 0.5) {
  for (let wall of walls) {
    const [wx, wy, wz] = wall.position;
    const [sx, sy, sz] = wall.scale;
    const rotation = wall.rotation[1];

    // 回転を考慮した境界ボックス
    let width, depth;
    if (Math.abs(Math.sin(rotation)) > 0.5) {
      width = sz;
      depth = sx;
    } else {
      width = sx;
      depth = sz;
    }

    // AABB衝突判定
    if (
      position.x + radius > wx - width / 2 &&
      position.x - radius < wx + width / 2 &&
      position.z + radius > wz - depth / 2 &&
      position.z - radius < wz + depth / 2
    ) {
      return true;
    }
  }

  // ボックスとの衝突判定
  for (let box of boxes) {
    const [bx, by, bz] = box.position;
    const [sx, sy, sz] = box.scale;

    if (position.x + radius > bx - sx / 2 && position.x - radius < bx + sx / 2 && position.z + radius > bz - sz / 2 && position.z - radius < bz + sz / 2) {
      return true;
    }
  }

  return false;
}

// 床コンポーネント
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#3a5a4a" />
    </mesh>
  );
}

// 壁コンポーネント
function Wall({ position, rotation = [0, 0, 0], scale = [1, 1, 1] }) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#6a5a4a" />
    </mesh>
  );
}

// 収集アイテムコンポーネント（距離判定に変更）
function CollectibleItem({ position, onCollect, id }) {
  const meshRef = useRef();
  const [collected, setCollected] = useState(false);
  const { camera } = useThree();

  useFrame((state) => {
    if (meshRef.current && !collected) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;

      // プレイヤーとの距離を計算
      const distance = camera.position.distanceTo(new THREE.Vector3(meshRef.current.position.x, camera.position.y, meshRef.current.position.z));

      // 近くにいる場合は大きく表示
      if (distance < 2) {
        meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.2);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  useEffect(() => {
    if (collected) return;

    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === "e" && meshRef.current) {
        const distance = camera.position.distanceTo(new THREE.Vector3(meshRef.current.position.x, camera.position.y, meshRef.current.position.z));

        if (distance < 2) {
          setCollected(true);
          onCollect(id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [collected, camera, onCollect, id]);

  if (collected) return null;

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.8} />
    </mesh>
  );
}

// 建物/構造物
function Structure() {
  return (
    <group>
      {/* 壁の描画 */}
      {walls.map((wall, i) => (
        <Wall key={i} position={wall.position} rotation={wall.rotation} scale={wall.scale} />
      ))}

      {/* ブロック */}
      {boxes.map((box, i) => (
        <mesh key={i} position={box.position}>
          <boxGeometry args={box.scale} />
          <meshStandardMaterial color="#5a4a4a" />
        </mesh>
      ))}

      {/* 目印となる色付きキューブ */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// プレイヤーコントローラー（修正版：WASDを正しい方向に）
function PlayerController({ isLocked, onNearItem, items }) {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const keys = useRef({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key] = true;
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key] = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!isLocked) return;

    direction.current.set(0, 0, 0);

    // 修正：W=前進、S=後退
    if (keys.current.w) direction.current.z += 1; // 前進
    if (keys.current.s) direction.current.z -= 1; // 後退
    if (keys.current.a) direction.current.x -= 1; // 左
    if (keys.current.d) direction.current.x += 1; // 右

    if (direction.current.length() > 0) {
      direction.current.normalize();

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

      velocity.current
        .copy(forward)
        .multiplyScalar(direction.current.z)
        .add(right.multiplyScalar(direction.current.x))
        .multiplyScalar(5 * delta);

      const newPos = camera.position.clone().add(velocity.current);

      // 衝突判定
      if (!checkWallCollision(newPos)) {
        camera.position.copy(newPos);
      }
    }

    // カメラの高さを固定
    camera.position.y = 1.6;

    // 近くのアイテムをチェック
    if (onNearItem && items) {
      let closest = null;
      let minDistance = Infinity;

      items.forEach((item) => {
        const distance = camera.position.distanceTo(new THREE.Vector3(item.position[0], camera.position.y, item.position[2]));

        if (distance < 2 && distance < minDistance) {
          minDistance = distance;
          closest = item;
        }
      });

      onNearItem(closest);
    }
  });

  return null;
}

// 近くのアイテム表示UI
function NearItemIndicator({ nearItem }) {
  if (!nearItem) return null;

  return (
    <div
      style={{
        // 画面上部に表示
        position: "absolute",
        top: "20px",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "rgba(255, 170, 0, 0.9)",
        color: "#000",
        padding: "15px 30px",
        borderRadius: "10px",
        fontSize: "18px",
        fontWeight: "bold",
        border: "3px solid #fff",
        pointerEvents: "none",
      }}
    >
      [E] キーでアイテムを取得
    </div>
  );
}

// メインシーン
function Scene({ onItemCollect, isLocked, items, onNearItem }) {
  return (
    <>
      {/* 強化されたライティング */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-10, 10, -5]} intensity={0.6} />
      <hemisphereLight args={["#87CEEB", "#3a5a4a", 0.5]} />

      {/* デバッグ用グリッド */}
      <Grid args={[50, 50]} cellSize={1} cellColor="#4a6a5a" sectionSize={5} sectionColor="#7a8a7a" />

      <Floor />
      <Structure />

      {/* 収集アイテム */}
      {items.map((item) => (
        <CollectibleItem key={item.id} position={item.position} id={item.id} onCollect={onItemCollect} />
      ))}

      <PlayerController isLocked={isLocked} onNearItem={onNearItem} items={items} />

      {/* 背景色（空の色） */}
      <color attach="background" args={["#2a3a4a"]} />

      {/* フォグ */}
      <fog attach="fog" args={["#2a3a4a", 15, 35]} />
    </>
  );
}

// UI
function GameUI({ score, itemCount, isLocked, totalItems }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        fontFamily: "monospace",
        color: "#fff",
        textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
      }}
    >
      {!isLocked && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            background: "rgba(0,0,0,0.85)",
            padding: "40px",
            borderRadius: "15px",
            fontSize: "18px",
            border: "3px solid #ffaa00",
          }}
        >
          <h1 style={{ margin: "0 0 20px 0", fontSize: "36px", color: "#ffaa00" }}>PS1風探索ゲーム</h1>
          <p style={{ margin: "15px 0", fontSize: "16px" }}>クリックしてゲームを開始</p>
          <div style={{ margin: "20px 0", padding: "20px", background: "rgba(255,170,0,0.15)", borderRadius: "8px" }}>
            <p style={{ margin: "8px 0", fontSize: "14px", opacity: 0.9 }}>
              <strong>W</strong>: 前進
            </p>
            <p style={{ margin: "8px 0", fontSize: "14px", opacity: 0.9 }}>
              <strong>S</strong>: 後退
            </p>
            <p style={{ margin: "8px 0", fontSize: "14px", opacity: 0.9 }}>
              <strong>A/D</strong>: 左右移動
            </p>
            <p style={{ margin: "8px 0", fontSize: "14px", opacity: 0.9 }}>
              <strong>マウス</strong>: カメラ回転
            </p>
            <p style={{ margin: "8px 0", fontSize: "14px", opacity: 0.9 }}>
              <strong>E</strong>: アイテム取得
            </p>
            <p style={{ margin: "8px 0", fontSize: "14px", opacity: 0.9 }}>
              <strong>ESC</strong>: 一時停止
            </p>
          </div>
          <p style={{ margin: "15px 0", fontSize: "14px", color: "#ffaa00" }}>黄色く光るアイテムを{totalItems}つ集めよう！</p>
        </div>
      )}

      {isLocked && (
        <>
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              background: "rgba(0,0,0,0.8)",
              padding: "15px 20px",
              borderRadius: "8px",
              fontSize: "16px",
              border: "2px solid #ffaa00",
            }}
          >
            <div style={{ color: "#ffaa00", fontWeight: "bold" }}>スコア: {score}</div>
            <div style={{ marginTop: "5px" }}>
              アイテム: {itemCount}/{totalItems}
            </div>
          </div>

          {itemCount === totalItems && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                background: "rgba(0,0,0,0.95)",
                padding: "40px 60px",
                borderRadius: "15px",
                fontSize: "24px",
                color: "#ffaa00",
                border: "3px solid #ffaa00",
              }}
            >
              <h2 style={{ margin: "0 0 20px 0", fontSize: "32px" }}>🎉 ミッション完了！</h2>
              <p style={{ margin: "10px 0", fontSize: "20px" }}>全アイテム収集成功</p>
              <p style={{ margin: "15px 0", fontSize: "18px", color: "#fff" }}>最終スコア: {score}</p>
              <p style={{ margin: "15px 0", fontSize: "14px", opacity: 0.7 }}>ESCキーで終了</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// メインアプリ
export default function App() {
  const [score, setScore] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [nearItem, setNearItem] = useState(null);

  const items = [
    { id: "item1", position: [3, 1, -3] },
    { id: "item2", position: [-4, 1, 4] },
    { id: "item3", position: [6, 1, -7] },
    { id: "item4", position: [-7, 1, -4] },
    { id: "item5", position: [0, 1, 6] },
  ];

  const handleItemCollect = (id) => {
    setScore((prev) => prev + 10);
    setItemCount((prev) => prev + 1);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#1a2a3a" }}>
      <Canvas
        camera={{ position: [0, 1.6, 5], fov: 75 }}
        shadows
        gl={{
          antialias: false,
          powerPreference: "high-performance",
        }}
      >
        <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />
        <Scene onItemCollect={handleItemCollect} isLocked={isLocked} items={items} onNearItem={setNearItem} />
      </Canvas>

      <GameUI score={score} itemCount={itemCount} isLocked={isLocked} totalItems={items.length} />
      {isLocked && <NearItemIndicator nearItem={nearItem} />}
    </div>
  );
}
