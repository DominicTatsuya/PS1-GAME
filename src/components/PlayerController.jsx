import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { checkGridCollision, worldToGrid } from "../systems/MapGenerator";

export default function PlayerController({
  isLocked,
  dungeon,
  onNearItem,
  items,
  onExitReach,
  exitActive,
  playerPosRef,
  exploredRef,
  staminaRef,
}) {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false });
  const headBob = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && dungeon) {
      camera.position.set(dungeon.startPos.x, dungeon.startPos.y, dungeon.startPos.z);
      initialized.current = true;
    }
  }, [dungeon, camera]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) keys.current[key] = true;
      if (e.key === "Shift") keys.current.shift = true;
    };
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) keys.current[key] = false;
      if (e.key === "Shift") keys.current.shift = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!isLocked || !dungeon) return;

    const { grid, gridW, gridH, cellSize } = dungeon;

    direction.current.set(0, 0, 0);
    if (keys.current.w) direction.current.z += 1;
    if (keys.current.s) direction.current.z -= 1;
    if (keys.current.a) direction.current.x -= 1;
    if (keys.current.d) direction.current.x += 1;

    const sprinting = keys.current.shift && staminaRef.current > 0 && direction.current.length() > 0;
    const speed = sprinting ? 7.5 : 4.5;

    if (sprinting) {
      staminaRef.current = Math.max(0, staminaRef.current - delta * 25);
    } else {
      staminaRef.current = Math.min(100, staminaRef.current + delta * 15);
    }

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
        .multiplyScalar(speed * delta);

      const newPosX = camera.position.clone();
      newPosX.x += velocity.current.x;
      if (!checkGridCollision(newPosX, grid, gridW, gridH, cellSize)) {
        camera.position.x = newPosX.x;
      }

      const newPosZ = camera.position.clone();
      newPosZ.z += velocity.current.z;
      if (!checkGridCollision(newPosZ, grid, gridW, gridH, cellSize)) {
        camera.position.z = newPosZ.z;
      }

      headBob.current += delta * (sprinting ? 14 : 9);
    }

    const bobAmount = direction.current.length() > 0 ? Math.sin(headBob.current) * 0.04 : 0;
    camera.position.y = 1.6 + bobAmount;

    if (playerPosRef) {
      playerPosRef.current = { x: camera.position.x, z: camera.position.z };
    }

    if (exploredRef) {
      const { gx, gy } = worldToGrid(camera.position.x, camera.position.z, gridW, gridH, cellSize);
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const ex = gx + dx;
          const ey = gy + dy;
          if (ex >= 0 && ex < gridW && ey >= 0 && ey < gridH) {
            exploredRef.current.add(`${ex},${ey}`);
          }
        }
      }
    }

    if (onNearItem && items) {
      let closest = null;
      let minDist = Infinity;
      items.forEach((item) => {
        const dist = camera.position.distanceTo(
          new THREE.Vector3(item.position[0], camera.position.y, item.position[2])
        );
        if (dist < 2.5 && dist < minDist) {
          minDist = dist;
          closest = item;
        }
      });
      onNearItem(closest);
    }

    if (onExitReach && exitActive && dungeon.exitPos) {
      const dist = camera.position.distanceTo(
        new THREE.Vector3(dungeon.exitPos.x, camera.position.y, dungeon.exitPos.z)
      );
      if (dist < 1.8) {
        onExitReach();
      }
    }
  });

  return null;
}
