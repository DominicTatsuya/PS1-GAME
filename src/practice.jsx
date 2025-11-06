import React, {useRef, useState,useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Grid } from "@react-three/drei";
import * as THREE from "three";

// 壁の衝突判定用の固定値座標データ
const walls = [
    // 外壁
    // position = 絶対位置, rotation = 回転角度, scale = 大きさ
    { position: [0,1.5,-10], rotation: [0,0,0], scale:[20,3,0.2] },
    { position: [0,1.5,10], rotation: [0,0,0], scale: [20,3,0.2] },
    // なんでMath.PI / 2.0? になるのかよくわかんない。外壁なんだからrotationは0でいいんじゃないの？
    { position: [-10,1.5,0], rotation:[0, Math.PI / 2.0], scale: [20,3,0.2] },
    { position: [10,1.5,0], rotation:[0, Math.PI / 2.0], scale: [20,3,0.2] },
    // 内部の壁
    // 内部の壁も微妙にrotationがあるのはなぜ？
    { position: [-5,1.5,0], rotation:[0, Math.PI / 2.0], scale: [10,3,0.2] },
    { position: [5,1.5,-5], rotation:[0,0,0], scale: [10,3,0.2] },
];

// 範囲内の障害物ボックスの座標データ
const boxes = [
    { position: [3,0.5,3], scale: [2,1,2] },
    { position: [-6,0.5,-6], scale: [1.5,1,1.5] },
];

// 壁との衝突判定を行う関数
// 引数となるのはプレイヤーの位置と半径という事なのか。これで半径を大きくするとプレイヤーが大きくなるという事なのか。
function checkWallCollision(position, radius = 0.5){
    // wallsは配列なので、for of文で一つずつ取り出す。
    // wallは壁の座標データのオブジェクトであり、position, rotation, scaleの3つのプロパティを持っている。
    // ３つのプロパティはx, y, zの3つの座標であらわされているということか！
    for(let wall of walls){
        // 各壁の位置をfor文が一回動くごとに割り出して、何処に壁があるかを確認
        const [wx, wy, wz] = wall.position;
        const [sx, sy, sz] = wall.scale;
        // rotationは固定値になっている？それともプレイヤーの回転によって変わる？
        // 常にrotaionのy軸の値を取り出すようにしているのはどのような意図によってだろうか？
        const rotation = wall.rotation[1];

        // 回転を考慮した境界ボックス
        let width, depth;
        // Math.abs は何をしてる？絶対値を取るようにしているのはなぜ？
        // Math.sin は何をしてる？sin関数を使っているのはなぜ？
        if(Math.abs(Math.sin(rotation)) > 0.5){
            width = sz;
            depth = sx;
        }else{
            width = sx;
            depth = sz;
        }

        // AABB衝突判定
        // オブジェクトを箱がたの形で空間内に描画し、その箱と重なっているかどうかで衝突しているかを判定するという認識
        if(position.x + radius > wx - width / 2 && position.x - radius < wx + width / 2 && position.z + radius > wz - depth / 2 && position.z - radius < wz + depth / 2){
            return true;
        }
    }
}


// 床コンポーネントの生成関数
function Floor(){
    // 即座にreturnしているという事は、この関数が動くタイミングで床が生成されるという事かな
    return(
        // <mesh>を使って、描画を行ってる？
        // 座標の渡し方でrotationにMath.PIを負の値になるように渡してるのは、x軸方向に回転しているという事？
        // positionが0なので、原点から床が生成されるという事？
        <mesh rotation={[-Math.PI / 2,0,0]} position={[0,0,0]} receiveShadow>
            {/* プレーンジオメトリ、平面を作成する用のジオメトリ（ジオメトリってなんだっけ）の事かな */}
            <planeGeometry args={[50,50]} />
            {/* mesh用の基本的なマテリアル設定？色の指定だけしているから他の要素は無いのかな */}
            <meshStandardMaterial color="#3a5a4a" />
        </mesh>
    );
}

// 壁コンポーネントの生成関数
function Wall({ position, rotation = [0,0,0], scale = [1,1,1] }){
    return(
        // なんで今回は引数としてposition, rotation, scaleを渡しているのかわからなかった。。。
        // scaleの指定もあるけど、全方向に1だけの壁を作って、それを連続して描画する、みたいなことなのか？
        <mesh position={position} rotation={rotation} scale={scale}>
            {/* boxGeometryは、箱の形を作成する用のジオメトリ（ジオメトリってなんだっけ）の事かな */}
            <boxGeometry args={[1,1,1]} />
            <meshStandardMaterial color="#6a5a4a" />
        </mesh>
    );
}

// 収集アイテムコンポーネント用関数
// 引数は収集用アイテムの場所、収集処理が完了しているかどうか、そのアイテムのID
function CollectibleItem({ position, onCollect,id}){
    // useRefもよくわかっていないなぁ。Reactの機能の一つか？
    // これを使って何かしらのオブジェクトを生成しているんだな、ということはわかっているつもり
    const meshRef = useRef();
    // useStateを使って管理される、React状のこのコンポーネントの状態の値
    // collectedを使って呼び出され、setCollectedに状態の値を代入することで、都度collectedの値が書き換わると認識している
    const [ collected, setCollected] = useState(false);
    // useThreeというオブジェクトがある？
    const {camera } = useThree();

    // useFrameは何をしているのかよくわからないな
    // stateの正誤によってｍ現在のmeshRefの回転と座標を修正している？meshRefはcameraが存在している場所のオブジェクトの事でいいんだっけ
    useFrame((state) => {
        if (meshRef.current && !collected) {
            meshRef.current.rotation.y += 0.02;
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;

            // 距離変数を作成しているのかな。 THREE.Vector3はThree.jsのオブジェクトの事でいいんだろうか。
            const distance = camera.position.distanceTo(new THREE.Vector3(meshRef.current.position.x, camera.position.y, meshRef.current.position.z));

            if (distance < 2) {
                meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.2);
            }else{
                meshRef.current.scale.setScalar(1);
            }
        }
    });

    // useEffectは一番初めに呼ばれる処理というイメージ
    useEffect(() => {
        // collectedがtrueの場合は何もしない
        if (collected) return;

        // キーが押されたときにどのような動作を行うかを設定している
        const handleKeyPress = (e) => {
            // eキーという事かな
            if( e.key.toLowerCase() === "e" && meshRef.current){
                const distance = camera.position.distanceTo(new THREE.Vector3(meshRef.current.position.x, camera.position.y, meshRef.current.position.z));

                // 距離が２未満の場合、collected のstateをtrueにして、onCollect(id)を呼び出す
                if(distance < 2){
                    setCollected(true);
                    // onCollectedはCollectibleItemの引数になっていたけど、内側から呼び出してる？
                    // いわゆるフォールバック関数ってこと？
                    onCollect(id);
                }
            }
        };

        // 何らかのキーた押されたら発火する？
        window.addEventListener("keydown", handleKeyPress);
        // でもそのあとにremoveしてる？よくわからない。どういうことなのか。
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [collected, camera, onCollect, id]);

    if (collected) return null;

    // 収集用アイテムの描画を行っている部分か
    return(
        <mesh ref={meshRef} position={position}>
            {/* オクタハイドレンなので、８面体？ */}
            <octahedronGeometry args={[0.3, 0]} />
            {/* colorはわかるけど、emissiveとemissiveIntensityはなんだろうか。 */}
            <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={0.8} />
        </mesh>
    );
}


function PlayerController ({isLocked, onNearItem,items )}{
    //ここで現在のシーンのカメラの情報を取得して、プレイヤー位置を算出するための情報として取得している
    const { camera} = useThree();
    // velosityはなんのために使われているのかよくわからない。
    const velocity = useRef(new.THREE.Vector3());
    const diretion = useRef(new THREE.Vector3());
    const keys = useRef({ w: false,a:false,s:false,d:false });

    useEffect(() => {
      const handleKeyDown = (e) => {
        const key = e.key.toLowerCase();
        if(key in keys.current) {
            keys.current[key] = true;
        }
      }
      
    })