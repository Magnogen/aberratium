const Sorder = (object, property, { frequency, springiness, response }) => {
  if (Array.isArray(property)) {
    let updaters = property.map(prop => Sorder(object, prop, { frequency, springiness, response }));
    return (...args) => {
      for (const update of updaters) {
        update(...args);
      }
    };
  }
  
  // @t3ssel8r is godsend
  // f    -> frequency
  // zeta -> springiness
  // r    -> response
  
  let x = object[property];
  let xp = object[property];
  let y = object[property];
  let yd = 0;
  let k1 = springiness / (Math.PI * frequency),
      k2 = 1 / ((2 * Math.PI * frequency) * (2 * Math.PI * frequency)),
      k3 = response * springiness / (2 * Math.PI * frequency);
  
  const update = (T) => {
    const xd = (x - xp) / T;
    xp = x;
    const k2_stable = Math.max(k2, 1.1 * (T*T/4 + T*k1/2));
    y += T*yd
    yd += T * (x + k3*xd - y - k1*yd) / k2_stable;
  }
  
  Reflect.defineProperty(object, property, {
    get() {
      return y;
    },
    set(value) {
      x = value;
    }
  });
  
  return update;
}