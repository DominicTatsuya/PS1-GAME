// ランダムマップ生成関数
export default function MapGenerator(seed = Math.random()) {
  // mulberry32でランダムな値を生成してそれを利用してrngを算出
//   const rng = mulberry32(seed * 10000);
  const mapSize = 10;
  const walls = [];
  for (let x = -mapSize; x <= mapSize; x++) {
    for (let z = -mapSize; z <= mapSize; z++) {
      // rng を利用しているけどなんでrng()なんだ？
      // rng() が 0.1未満の場合含め、ｘとzがmapSizeと同じになった場合に、壁を生成するという事か。
      if (Math.abs(x) === mapSize || Math.abs(z) === mapSize) {
        walls.push({ position: [x, 0.5, z], scale: [1, 1, 1] });
      }
    }
  }
  return { walls };
}

function mulberry32(a) {
  return function () {
    // ここから下の式が全く意味が分からない。。。
    // 数学的な素養が無いと理解できないんだろうな。。。絶望。。。
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
