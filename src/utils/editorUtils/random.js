import seedrandom from "seedrandom";
class SeededRandom {
  rng;
  constructor(seed) {
    this.rng = seedrandom(seed);
  }
  /**
   * Returns random number between 0 (inclusive) and 1 (exclusive)
   */
  random() {
    return this.rng();
  }
  /**
   * Returns random integer between min (inclusive) and max (exclusive)
   */
  randInt(min, max) {
    return Math.floor(this.random() * (max - min)) + min;
  }
  /**
   * Shuffles array in-place using Fisher-Yates algorithm
   * Returns the shuffled array for chaining
   */
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.randInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  /**
   * Returns random element from array
   */
  choice(array) {
    if (array.length === 0) return void 0;
    return array[this.randInt(0, array.length)];
  }
}
function generateSeed() {
  return `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
export {
  SeededRandom,
  generateSeed
};
