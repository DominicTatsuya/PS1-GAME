// ランダムマップ生成関数の呼び出し
import { generateMap } from "./systems/MapGenerator";

function Scene({ seed }) {
    const [mapData] = useState(() => generateMap(seed));
    return (
        <>
            <Floor />
            {mapData.walls.map((w,i) => <Wall key={i} {...w} />)}
        </>
    );
}