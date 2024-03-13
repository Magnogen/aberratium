const vec2 = (() => {
  function add(other)  { return vec2(this.x + other.x, this.y + other.y) }
  function sub(other)  { return vec2(this.x - other.x, this.y - other.y) }
  function mul(val)    { return vec2(this.x * val, this.y * val) }
  function div(val)    { return vec2(this.x / val, this.y / val) }
  function length()    { return Math.hypot(this.x, this.y) }
  function angle()     { return Math.atan2(this.y, this.x) }
  function turn(a)     { return vec2(
      this.x*Math.cos(a) - this.y*Math.sin(a),
      this.x*Math.sin(a) + this.y*Math.cos(a)
  ) }
  function dot(other)  { return this.x*other.x + this.y*other.y }
  function normalize() {
      const len = this.length();
      return vec2(this.x / len, this.y / len);
  }
  function map(fn) { return vec2(fn(this.x, 'x'), fn(this.y, 'y')); }
  return (x, y) => ({
      x, y,
      0: x, 1: y,
      *[Symbol.iterator]() { yield* [x, y]; },
      add, sub,
      mul, div,
      length, normalize,
      angle, turn,
      dot,
      map,
  })
})();

const vec3 = (() => {
  function add(other) { return vec3(this.x + other.x, this.y + other.y, this.z + other.z) }
  function sub(other) { return vec3(this.x - other.x, this.y - other.y, this.z - other.z) }
  function mul(val)   { return vec3(this.x * val, this.y * val, this.z * val) }
  function div(val)   { return vec3(this.x / val, this.y / val, this.z / val) }
  function length()   { return Math.hypot(this.x, this.y, this.z) }
  function dot(other) { return this.x * other.x + this.y * other.y + this.z * other.z }
  function cross(other) {
      return vec3(
          this.y * other.z - this.z * other.y,
          this.z * other.x - this.x * other.z,
          this.x * other.y - this.y * other.x
      )
  }
  function normalize() {
      const len = this.length();
      return vec3(this.x / len, this.y / len, this.z / len);
  }
  return (x, y, z) => ({
      x, y, z,
      add, sub,
      mul, div,
      length,
      dot, cross,
      normalize,
  })
})();
