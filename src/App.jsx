import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { generateDungeon } from "./systems/MapGenerator";
import DungeonWalls from "./components/Structure";
import Floor from "./components/Floor";
import Ceiling from "./components/Ceiling";
import Torches from "./components/Torch";
import PlayerController from "./components/PlayerController";
import CollectibleItem from "./components/CollectibleItem";
import ExitPortal from "./components/Goal";
import GameUI from "./components/UI/GameUI";
import NearItemIndicator from "./components/UI/NearItemIndicator";
import Minimap from "./components/UI/Minimap";
import "./App.css";

function DungeonScene({ dungeon, onItemCollect, isLocked, items, collectedItemsRef, onNearItem, exitActive, onExitReach, playerPosRef, exploredRef, staminaRef, cameraYawRef }) {
  return (
    <>
      <ambientLight intensity={0.55} color="#bbbbdd" />
      <hemisphereLight args={["#9988aa", "#665544", 0.6]} />
      <directionalLight position={[0, 10, 0]} intensity={0.15} color="#aaaacc" />

      <Floor gridW={dungeon.gridW} gridH={dungeon.gridH} cellSize={dungeon.cellSize} />
      <Ceiling gridW={dungeon.gridW} gridH={dungeon.gridH} cellSize={dungeon.cellSize} wallHeight={dungeon.wallHeight} />
      <DungeonWalls wallPositions={dungeon.wallPositions} cellSize={dungeon.cellSize} wallHeight={dungeon.wallHeight} />
      <Torches positions={dungeon.torches} />

      {items.map((item) => (
        <CollectibleItem key={item.id} position={item.position} id={item.id} onCollect={onItemCollect} />
      ))}

      <ExitPortal position={dungeon.exitPos} active={exitActive} />

      <PlayerController
        isLocked={isLocked}
        dungeon={dungeon}
        onNearItem={onNearItem}
        items={items}
        collectedItemsRef={collectedItemsRef}
        onExitReach={onExitReach}
        exitActive={exitActive}
        playerPosRef={playerPosRef}
        exploredRef={exploredRef}
        staminaRef={staminaRef}
        cameraYawRef={cameraYawRef}
      />

      <color attach="background" args={["#0a0808"]} />
      <fog attach="fog" args={["#0c0a08", 3, 26]} />
    </>
  );
}

export default function App() {
  const [seed, setSeed] = useState(() => Date.now());
  const [score, setScore] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [collectedItems, setCollectedItems] = useState(new Set());
  const collectedItemsRef = useRef(new Set());
  const [isLocked, setIsLocked] = useState(false);
  const [nearItem, setNearItem] = useState(null);
  const [cleared, setCleared] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stamina, setStamina] = useState(100);

  const playerPosRef = useRef({ x: 0, z: 0 });
  const exploredRef = useRef(new Set());
  const staminaRef = useRef(100);
  const cameraYawRef = useRef(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const controlsRef = useRef();

  const dungeon = useMemo(() => generateDungeon(seed), [seed]);
  const items = useMemo(() => dungeon.items, [dungeon]);
  const totalItems = items.length;
  const exitActive = itemCount >= totalItems;

  useEffect(() => {
    if (isLocked && !cleared && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    if (isLocked && !cleared) {
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime((Date.now() - startTimeRef.current) / 1000);
        }
        setStamina(staminaRef.current);
      }, 100);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLocked, cleared]);

  const handleItemCollect = useCallback((id) => {
    collectedItemsRef.current.add(id);
    setScore((prev) => prev + 10);
    setItemCount((prev) => prev + 1);
    setCollectedItems(new Set(collectedItemsRef.current));
  }, []);

  const handleExitReach = useCallback(() => {
    if (!cleared) {
      setCleared(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [cleared]);

  const handleRestart = useCallback(() => {
    setSeed(Date.now());
    setScore(0);
    setItemCount(0);
    collectedItemsRef.current = new Set();
    setCollectedItems(new Set());
    setCleared(false);
    setElapsedTime(0);
    setStamina(100);
    staminaRef.current = 100;
    exploredRef.current = new Set();
    playerPosRef.current = { x: 0, z: 0 };
    startTimeRef.current = null;
  }, []);

  const handleLock = useCallback(() => {
    if (cleared) {
      handleRestart();
    }
    setIsLocked(true);
  }, [cleared, handleRestart]);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  return (
    <div className="game-container">
      <Canvas
        camera={{ position: [dungeon.startPos.x, dungeon.startPos.y, dungeon.startPos.z], fov: 75, near: 0.1, far: 40 }}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
        dpr={0.65}
      >
        <PointerLockControls
          ref={controlsRef}
          onLock={handleLock}
          onUnlock={handleUnlock}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
        />
        <DungeonScene
          dungeon={dungeon}
          onItemCollect={handleItemCollect}
          isLocked={isLocked}
          items={items}
          collectedItemsRef={collectedItemsRef}
          onNearItem={setNearItem}
          exitActive={exitActive}
          onExitReach={handleExitReach}
          playerPosRef={playerPosRef}
          exploredRef={exploredRef}
          staminaRef={staminaRef}
          cameraYawRef={cameraYawRef}
        />
      </Canvas>

      <div className="scanlines" />

      <GameUI
        score={score}
        itemCount={itemCount}
        totalItems={totalItems}
        isLocked={isLocked}
        elapsedTime={elapsedTime}
        stamina={stamina}
        cleared={cleared}
        cameraYawRef={cameraYawRef}
      />

      {isLocked && !cleared && <NearItemIndicator nearItem={nearItem} />}

      {isLocked && !cleared && (
        <Minimap
          dungeon={dungeon}
          playerPosRef={playerPosRef}
          exploredRef={exploredRef}
          items={items}
          collectedItemsRef={collectedItemsRef}
          exitActive={exitActive}
          cameraYawRef={cameraYawRef}
        />
      )}
    </div>
  );
}
