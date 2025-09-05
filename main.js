// jshint esversion: 11, loopfunc: true, laxbreak: false
(async () => {
  
  // welcome to the beautiful mess of aberratium's source code
  
  // mostly uncommented
  // rushed in two weeks
  // mostly all in one file
  // confusing names
  
  // here be dragons
  
  
  
  
  
  const c = $('canvas');
  const ctx = c.getContext('2d');
  const effectCanvas = document.createElement('canvas');
  const etx = effectCanvas.getContext('2d');
  
  //Import sounds
  let SOUNDS = {};
  let audioContext = new AudioContext();
  const loadSound = (name) => {
    let request = new XMLHttpRequest();
    request.open('GET', 'sounds/'+name+'.wav')
    request.responseType = 'arraybuffer'
    request.onload = () => {
      audioContext.decodeAudioData(request.response, (buffer) => SOUNDS[name] = buffer );
    }
    request.send();
  };
  const playSound = (name, { detune=0 }={}) => {
    var s = SOUNDS[name];
    var source = audioContext.createBufferSource();
    source.buffer = s;
    source.connect(audioContext.destination);
    source.detune.value = detune;
    source.start(0);
  };
  loadSound('fire');
  loadSound('fire3');
  loadSound('engine2');
  loadSound('explode4');
  // loadSound('bg');
  
  const { sin, cos, PI, SQRT2, min, max, round, floor, ceil, sign, abs, pow, exp, sqrt } = Math;
  const SQRT3 = sqrt(3);
  const mod = (x, m) => ((x%m)+m)%m;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const sigmoid = (n, a, b) => {
    if (b < a) return sigmoid(n, b, a);
    return (b - a) / (1 + exp(4 * (a - n) / (b - a) + 2)) + a;
  };
  const repeat = (n, fn) => {
    let i = 0, res;
    while (i < n) res = fn(i++);
    return res;
  };
  const pointsOnCircle = (origin, radius, amount, phase=0) => [...Array(amount)].map((e, i) => vec2(
    origin.x + radius*cos(i/amount*2*PI + phase),
    origin.y + radius*sin(i/amount*2*PI + phase)
  ));
  
  let time = 0;
  let pageStart = 0;
  let screen = {
    pos: vec2(0, 0),
    zoom: 1,
    zoomMultiplier: 1,
    isDirty: true,
    width: 0,
    height: 0,
    center: vec2(0, 0),
    minBox: 0,
    maxBox: 0,
    handleDirtiness() {
      if (!screen.isDirty) return;
      screen.width  = effectCanvas.width  = c.width  = innerWidth;
      screen.height = effectCanvas.height = c.height = innerHeight;
      screen.center = vec2(screen.width / 2, screen.height / 2);
      screen.minBox = min(screen.width, screen.height);
      screen.maxBox = max(screen.width, screen.height);
      screen.isDirty = false;
    },
    page: FSM({
      initially: 'main',
      states: {
        thumbnail: {
          tick() { thumbnail() }
        },
        main: {
          tick(dt) {
            main(dt, time - pageStart);
          }
        },
        play: {
          tick(dt) {
            game(dt, time - pageStart);
          }
        },
      },
      before: {
        tick(dt) {
          time += 1/60;
        },
      },
      entering: {
        main() { pageStart = time },
        play() { pageStart = time },
      }
    })
  };
  screen.updatePos = Sorder(screen.pos, ['x', 'y'], {
    frequency: 1.5,
    springiness: 1.5,
    response: 3,
  });
  screen.updateZoom = Sorder(screen, 'zoom', {
    frequency: 1,
    springiness: 1.5,
    response: 4,
  });
  on('resize', (event) => screen.isDirty = true );
  
  let border = [];
  const worldSize = 3;
  const borderSize = 0.01;
  
  let player = {
    pos: vec2(0, 0),
    vel: vec2(0, 0),
    direction: vec2(1, 0),
    health: [1, 1, 1],
    size: 0.075,
    aberrationStrength: 0,
    isAlive: true,
  };
  player.updateDirection = Sorder(player.direction, ['x', 'y'], {
    frequency: 1,
    springiness: 0.5,
    response: 2,
  });
  
  let enemies = [];
  const enemySize = 0.05;
  let enemyDensity = 10/3;
  let spawningEnemies = true;
  const makeEnemy = ({ pos, hue }) => ({
    pos, vel: vec2(0, 0),
    hue, direction: rand(2*PI),
    id: rand(), health: 1,
    // age: 0
  });
  
  let bullets = [];
  const bulletSize = 0.005;
  const invisibleBullets = false;
  let firingCooldown = 80;
  const makeBullet = ({ pos, vel }) => ({
    pos, vel, age: 100,
    lastPos: pos,
    active: true
  });
  
  let particles = [];
  const makeParticle = ({ pos, vel, col }) => ({
    pos, vel, col
  });
  
  let gems = [];
  const makeGem = ({ pos, vel, col }) => ({
    pos, vel, col, active: true, size: rand(0.001, 0.01)
  });
  
  let stars = [];
  const starSize = 0.1;
  const starDensity = 1/3;
  const makeStar = ({ pos, vel, col }) => ({
    pos, vel, direction: rand(2*PI), col, active: true, health: 10, size: 1,
  });
  
  
  
  let keys = {};
  on('keydown', (event) => keys[event.code] = true );
  on('keyup', (event) => keys[event.code] = false );
  
  let mouse = {
    pos: vec2(0, 0),
    isDown: false,
    radius: 1,
    state: FSM({
      before: {
        move(event) { [mouse.pos.x, mouse.pos.y] = [event.x, event.y]; },
        down(event) { mouse.isDown = true; },
        up(event)   { mouse.isDown = false; },
      }
    })
  };
  on('mousedown', mouse.state.event('down'));
  on('mouseup',   mouse.state.event('up'  ));
  on('mousemove', mouse.state.event('move'));
  const updateMouseRadius = Sorder(mouse, 'radius', {
    frequency: 4,
    springiness: 0.25,
    response: 1,
  });
  
  const background = () => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(16, 16, 16, ${max(0.01, 1 - player.aberrationStrength)})`;
    ctx.fillRect(0, 0, screen.width, screen.height);
    
    etx.globalCompositeOperation = 'source-over';
    etx.fillStyle = `rgba(0, 0, 0, ${max(0.01, 0.5 - player.aberrationStrength)})`;
    etx.fillRect(0, 0, screen.width, screen.height);
    
    etx.globalCompositeOperation = 'difference';
    etx.fillStyle = '#010101';
    etx.fillRect(0, 0, screen.width, screen.height);
  };

  const calculateBorder = () => {
    border = convexhull.makeHull([
      
      vec2(-worldSize, -worldSize),
      vec2( worldSize, -worldSize),
      vec2( worldSize,  worldSize),
      vec2(-worldSize,  worldSize),
      
      bullets.map(bullet => pointsOnCircle(bullet.pos, bulletSize + borderSize, 5)),
      gems.map(gem => pointsOnCircle(gem.pos, gem.size + borderSize, 5)),
      enemies.map(enemy  => pointsOnCircle(enemy.pos, enemySize+borderSize, 64)),
      player.isAlive ? pointsOnCircle(player.pos, player.size + borderSize, 3, player.direction.angle()) : [],
      
    ].flat(Infinity));
  };
  
  const updateMouse = () => {
    mouse.radius = mouse.isDown ? 2 : 1;
    updateMouseRadius(1/60);
    
    screen.pos.x = player.pos.x;
    screen.pos.y = player.pos.y;
    screen.updatePos(1/60);
    
    if (player.isAlive) {
      screen.zoom = max(0.01, 1 - player.aberrationStrength*20) * screen.zoomMultiplier;
      screen.updateZoom(1/60);
    } else {
      screen.zoom = 0.5 * screen.zoomMultiplier;
      screen.updateZoom(0.01/60);
    }
  };
  
  const renderWorld = (offset=vec2(0, 0)) => {
    ctx.globalCompositeOperation = 'source-over';
    const gap = 1 / 8;
    
    ctx.beginPath();
    
    repeat(worldSize/gap, (x) => {
      ctx.moveTo( x*gap + mod(offset.x, gap), -worldSize);
      ctx.lineTo( x*gap + mod(offset.x, gap),  worldSize);
      ctx.moveTo(-x*gap + mod(offset.x, gap), -worldSize);
      ctx.lineTo(-x*gap + mod(offset.x, gap),  worldSize);
    });
    
    repeat(worldSize/gap, (y) => {
      ctx.moveTo(-worldSize,  y*gap + mod(offset.y, gap));
      ctx.lineTo( worldSize,  y*gap + mod(offset.y, gap));
      ctx.moveTo(-worldSize, -y*gap + mod(offset.y, gap));
      ctx.lineTo( worldSize, -y*gap + mod(offset.y, gap));
    });
    
    ctx.strokeStyle = `rgba(24, 24, 24, ${max(0.01, 1-10*player.aberrationStrength)})`;
    // ctx.strokeStyle = '#181818';
    ctx.lineWidth = 0.005;
    ctx.stroke();
  };
  
  const renderBorder = () => {
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.beginPath();
    for (const { x, y } of border) ctx.lineTo(x, y);
    ctx.lineTo(border[0].x, border[0].y);
    ctx.lineTo(border[1].x, border[1].y);
    
    ctx.strokeStyle = '#202020';
    ctx.lineWidth = borderSize;
    ctx.stroke();
  };
  
  const updatePlayer = (inWorld) => {
    // if (keys.Space) {
    //   player.health[0|rand(3)] *= 0.9; 
    // }
    
    if (player.isAlive && player.health.every(v => v < 0.2)) {
      playSound('explode4', { detune: randpom(600) });
      player.isAlive = false;
      repeat(60, () => {
        const vel = vec2(-1, 0).turn(rand(2*PI)).mul(randbin(0.01, 0.002));
        particles.push(makeParticle({
          pos: player.pos,
          vel: vel.add(player.vel),
          col: `oklch(${rand(0.1, 0.4)} 0.2 ${rand(360)})`
        }));
      });
    }
        
    const direction = inWorld.sub(player.pos).normalize();
    player.direction.x = direction.x;
    player.direction.y = direction.y;
    player.updateDirection(1/60);
    
    player.aberrationStrength = 1-exp(-max(player.vel.length()-0.02, 0));
    
    if (mouse.isDown && player.isAlive) {
      playSound('engine2', { detune: rand(-200) });
      repeat(1, () => {
        const vel = vec2(-1, 0).turn(player.direction.angle() + randbin(0, 0.25)).mul(randbin(0.01, 0.002));
        particles.push(makeParticle({
          pos: player.pos.add(vel.normalize().mul(player.size/2)),
          vel: vel.add(player.vel),
          col: `oklch(${rand(0.1, 0.4)} ${player.aberrationStrength*10} ${rand(360)})`
        }));
      });
      let force = player.direction.div(5000);
      if (force.dot(player.vel) < 0) force = force.mul(2)
      player.vel = player.vel.add(force.normalize().mul(clamp(force.length(), 0, 0.005)));
    }
    
    if (player.isAlive) {
      const clampedPos = player.pos.map(e => clamp(e, -worldSize+player.size, worldSize-player.size));
      player.vel = player.vel.sub(player.pos.sub(clampedPos).div(500));
      if (player.aberrationStrength > 0) {
        const i = 0|rand(3);
        player.health[i] = clamp(player.health[i] + 0.01, 0, 1)
      }
    }
    
    player.vel = player.vel.mul(0.995);
    
    player.pos = player.pos.add(player.vel);
  };
  
  const renderPlayer = () => {
    if (!player.isAlive) return;
    
    ctx.globalCompositeOperation = 'lighter';
    const verts = pointsOnCircle(player.pos, player.size, 3, player.direction.angle());
    
    ctx.beginPath();
    repeat(verts.length, (i) => {
      const { x, y } = verts[i];
      ctx.lineTo(
        x + cos(time + i + 2*PI*0/3)*player.aberrationStrength,
        y + sin(time + i + 2*PI*0/3)*player.aberrationStrength
      );
    });
    ctx.closePath();
    ctx.fillStyle = `rgb(${192*player.health[0]}, 0, 0)`;
    ctx.fill();
    ctx.strokeStyle = `rgb(192, 0, 0)`;
    ctx.lineWidth = 0.001;
    ctx.stroke();
    
    ctx.beginPath();
    repeat(verts.length, (i) => {
      const { x, y } = verts[i];
      ctx.lineTo(
        x + cos(time + i + 2*PI*1/3)*player.aberrationStrength,
        y + sin(time + i + 2*PI*1/3)*player.aberrationStrength
      );
    });
    ctx.closePath();
    ctx.fillStyle = `rgb(0, ${192*player.health[1]}, 0)`;
    ctx.fill();
    ctx.strokeStyle = `rgb(0, 192, 0)`;
    ctx.lineWidth = 0.001;
    ctx.stroke();
    
    ctx.beginPath();
    repeat(verts.length, (i) => {
      const { x, y } = verts[i];
      ctx.lineTo(
        x + cos(time + i + 2*PI*2/3)*player.aberrationStrength,
        y + sin(time + i + 2*PI*2/3)*player.aberrationStrength
      );
    });
    ctx.closePath();
    ctx.fillStyle = `rgb(0, 0, ${192*player.health[2]})`;
    ctx.fill();
    ctx.strokeStyle = `rgb(0, 0, 192)`;
    ctx.lineWidth = 0.001;
    ctx.stroke();
  };
  
  const renderMouse = (inWorld) => {
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(inWorld.x, inWorld.y, mouse.radius * 0.01, 0, 2*PI);
    ctx.fillStyle = '#888';
    ctx.fill();
  };
  
  const spawnEnemy = () => {
    const enemy = makeEnemy({
      pos: player.pos,
      hue: rand(360),
    });
    enemy.updateHealth = Sorder(enemy, 'health', {
      frequency: 1,
      springiness: 0.5,
      response: 4,
    });
    do {
      enemy.pos = vec2(randpom(worldSize), randpom(worldSize));
    } while (enemy.pos.sub(player.pos).length() < screen.maxBox/screen.minBox);
    enemies.push(enemy);
  };
  
  const updateEnemies = () => {
    if (enemies.length == 0) {
      firingCooldown = firingCooldown > 1 ? firingCooldown/2 : firingCooldown - 2;
      enemyDensity *= 1.1;
      spawningEnemies = true;
      screen.zoomMultiplier *= 0.9;
    }
    if (spawningEnemies) {
      spawnEnemy();
      spawningEnemies = enemies.length < (0|worldSize*worldSize*enemyDensity);
    }
    
    let i = 0;
    while (i < enemies.length) {
      const enemy = enemies[i];
      
      enemy.updateHealth(1/60);
      
      const clampedPos = enemy.pos.map(e => clamp(e, -worldSize+enemySize*2, worldSize-enemySize*2));
      enemy.vel = enemy.vel.sub(enemy.pos.sub(clampedPos).div(500));
      
      if (player.isAlive) {
        const toPlayer = player.pos.sub(enemy.pos);
        if (toPlayer.length() < 1) {
          enemy.vel = enemy.vel.add(toPlayer.normalize().mul(0.0001))
        }
        if (toPlayer.length() < player.size) {
          if (player.aberrationStrength > 0) {
            enemy.health -= 10;
          } else {
            const targetedHealth = 0|rand(3);
            repeat(1, () => particles.push(makeParticle({
              pos: player.pos.add(vec2(1, 0).mul(player.size/2).turn(rand(2*PI))),
              vel: player.vel.add(toPlayer.div(4)).turn(randbin(0, 0.1)).mul(rand(rand())),
              col: `oklch(${rand(0.4, 0.75)} 0.5 ${enemy.hue} / 0.5)`,
            })));
            if (player.health[2] > 0.1) player.health[2] *= 0.99;
            else if (player.health[1] > 0.1) player.health[1] *= 0.99;
            if (player.health[0] > 0.1) player.health[0] *= 0.99;
            // player.health[0] *= r/255;
            // player.health[1] *= g/255;
            // player.health[2] *= b/255;
          }
        }
      }
      enemy.direction += randpom(0.5);
      enemy.vel = enemy.vel.add(vec2(0.0001, 0).turn(enemy.direction));
      enemy.direction += randpom(0.01);
      
      for (const other of enemies) {
        if (other.id == enemy.id) continue;
        const toOther = other.pos.sub(enemy.pos);
        enemy.vel = enemy.vel.sub(toOther.normalize().div((toOther.length()*1000)**2))
      }
      
      for (const bullet of bullets) {
        if (!bullet.active) continue;
        const toBullet = bullet.pos.sub(enemy.pos);
        if (toBullet.length() > enemySize + bulletSize) continue;
        playSound('fire', { detune: randpom(600) - 1200 })
        enemy.vel = enemy.vel.sub(toBullet.mul(0.1));
        enemy.health -= player.aberrationStrength*10 + 0.2;
        bullet.active = false;
        repeat(10, () => particles.push(makeParticle({
          pos: bullet.pos,
          vel: bullet.vel.add(toBullet.div(4)).turn(randbin(0, 0.1)).mul(rand(rand())),
          col: `oklch(${rand(0.4, 0.75)} 0.5 ${enemy.hue} / 0.5)`,
        })));
      }
      
      for (const gem of gems) {
        const toGem = gem.pos.sub(enemy.pos);
        if (toGem.length() > enemySize + gem.size) continue; 
        playSound('fire', { detune: randpom(600) - 1200 });
        enemy.vel = enemy.vel.sub(toGem.mul(0.1));
        enemy.health -= player.aberrationStrength*10 + 0.1;
        gem.active = false;
        repeat(10, () => particles.push(makeParticle({
          pos: gem.pos,
          vel: gem.vel.add(toGem.div(3)).turn(randbin(0, 0.1)).mul(rand(rand())),
          col: `oklch(${rand(0.4, 0.75)} 0.5 ${enemy.hue} / 0.5)`,
        })));
      }
      
      enemy.vel = enemy.vel.mul(0.975);
      enemy.pos = enemy.pos.add(enemy.vel);
      
      if (enemy.health < 0.01) {
        playSound('explode4', { detune: randpom(600) });
        repeat(60, () => {
          const vel = vec2(1, 0).mul(rand(0.02)).turn(rand(2*PI));
          particles.push(makeParticle({
            pos: enemy.pos.add(vel.normalize().mul(rand(enemySize)).turn(randbin(0, 0.1))),
            vel: vel,
            col: `oklch(${rand(0.4, 0.75)} 0.5 ${enemy.hue} / 0.5)`
          }));
        });
        repeat(10, () => {
          gems.push(makeGem({
            pos: enemy.pos.add(vec2(1, 0).mul(rand(enemySize)).turn(rand(2*PI))),
            vel: vec2(0, 0),
            col: `oklch(${rand(0.5, 0.8)} 0.5 ${enemy.hue})`
          }));
        });
        [enemies[i], enemies[enemies.length-1]] = [enemies[enemies.length-1], enemies[i]];
        enemies.pop();
      } else i++;
    }
  };
  
  const renderEnemies = () => {
    ctx.globalCompositeOperation = 'lighter';
    for (const enemy of enemies) {
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, enemySize, 0, 2*PI);
      ctx.fillStyle = `oklch(0.5 0.5 ${enemy.hue})`;
      ctx.lineWidth = 0.01;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, enemySize, 0, 2*PI);
      ctx.strokeStyle = `oklch(0.4 0.5 ${enemy.hue})`;
      ctx.lineWidth = 0.02;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(enemy.pos.x, enemy.pos.y, 0.03, time + enemy.id*PI*2 - (PI*enemy.health), time + enemy.id*PI*2 + (PI*enemy.health));
      ctx.strokeStyle = `oklch(0.75 0.25 ${enemy.hue})`;
      ctx.lineWidth = 0.01;
      ctx.stroke();
      
      let toEnemy = screen.pos.sub(enemy.pos);
      
      if (toEnemy.length() < 0.5) continue;
      ctx.beginPath();
      const triangle = pointsOnCircle(
        screen.pos.sub(toEnemy.normalize().mul(sigmoid(toEnemy.length()/2, 0, 0.4/screen.zoom))),
        0.02, 3, PI+toEnemy.angle()
      );
      for (const { x, y } of triangle) {
        ctx.lineTo(x, y);
      }
      if (time % 0.2 < 0.1 && toEnemy.length() < 1 && player.isAlive) {
        ctx.fillStyle = `oklch(0.5 0.5 ${enemy.hue} / 0.67)`;
      } else if (player.isAlive) {
        ctx.fillStyle = `oklch(0.5 0.5 ${enemy.hue} / ${clamp(exp(-toEnemy.length()*2), 0.1, 0.5)})`;
      } else {
        ctx.fillStyle = `oklch(0.5 0.5 ${enemy.hue} / ${clamp(screen.zoom-0.5, 0, 0.1)})`;
      }
      ctx.fill();
    }
  };
  
  const updateBullets = () => {
    let i = 0;
    while (i < bullets.length) {
      const bullet = bullets[i];
      
      const clampedPos = bullet.pos.map(e => clamp(e, -worldSize, worldSize));
      bullet.vel = bullet.vel.sub(bullet.pos.sub(clampedPos).div(5));
      
      bullet.lastPos = bullet.pos;
      bullet.pos = bullet.pos.add(bullet.vel);
      
      bullet.age--;
      if (bullet.age < 0 || !bullet.active) {
        [bullets[i], bullets[bullets.length-1]] = [bullets[bullets.length-1], bullets[i]];
        bullets.pop();
      } else i++;
    }
  };
  
  const renderBullets = () => {
    ctx.globalCompositeOperation = 'lighten';
    ctx.lineCap = 'round';
    ctx.lineWidth = bulletSize;
    ctx.strokeStyle = '#888';
    for (const bullet of bullets) {
      ctx.beginPath();
      ctx.moveTo(bullet.pos.x, bullet.pos.y);
      ctx.lineTo(bullet.lastPos.x, bullet.lastPos.y);
      ctx.stroke();
    }
  };
  const fire = () => {
    playSound('fire', { detune: randpom(200) });
    player.vel = player.vel.sub(player.direction.mul(0.0001));
    bullets.push(makeBullet({
      pos: player.pos.add(player.direction.normalize().mul(player.size)),
      vel: player.direction.normalize().mul(0.02).add(player.vel),
    }));
  };
  
  const updateParticles = () => {
    let i = 0;
    while (i < particles.length) {
      const particle = particles[i];
      
      // const clampedPos = particle.pos.map(e => clamp(e, -worldSize, worldSize));
      // particle.vel = particle.vel.sub(particle.pos.sub(clampedPos).div(5));
      
      particle.vel = particle.vel.mul(0.95);
      particle.pos = particle.pos.add(particle.vel);
      
      if (particle.vel.length() < 0.0001) {
        [particles[i], particles[particles.length-1]] = [particles[particles.length-1], particles[i]];      
        particles.pop();
      } else i++;
    }
  };
  
  const renderParticles = () => {
    etx.globalCompositeOperation = 'lighter';
    for (const particle of particles) {
      etx.beginPath();
      etx.arc(particle.pos.x, particle.pos.y, particle.vel.length(), 0, 2*PI);
      etx.fillStyle = particle.col;
      etx.fill();
    }
  };
  
  const updateGems = () => {
    let i = 0;
    while (i < gems.length) {
      const gem = gems[i];
      
      const toPlayer = player.pos.sub(gem.pos);
      gem.vel = gem.vel.add( toPlayer.normalize().mul(toPlayer.length()**2 / 1000) );
      const toOther = choose(gems).pos.sub(gem.pos);
      if (toOther.length() > 0) {
        gem.vel = gem.vel.sub( toOther.normalize().div(toOther.length() * 100000) );
      }
      
      const clampedPos = gem.pos.map(e => clamp(e, -worldSize, worldSize));
      gem.vel = gem.vel.sub(gem.pos.sub(clampedPos).div(5));
      
      gem.vel = gem.vel.mul(0.99);
      gem.pos = gem.pos.add(gem.vel);
      
      if (!gem.active) {
        [gems[i], gems[gems.length-1]] = [gems[gems.length-1], gems[i]];      
        gems.pop();
      } else i++;
    }
  };
  
  const renderGems = () => {
    ctx.globalCompositeOperation = 'lighter';
    for (const gem of gems) {
      ctx.beginPath();
      ctx.arc(gem.pos.x, gem.pos.y, gem.size, 0, 2*PI);
      ctx.fillStyle = gem.col;
      ctx.fill();
    }
  };
  
  const spawnStar = () => {
    const star = makeStar({
      pos: player.pos,
      vel: vec2(0, 0),
      col: 'oklch(0.5, 0.5, 60)'
    });
    star.updateHealth = Sorder(star, 'health', {
      frequency: 1,
      springiness: 0.5,
      response: 4,
    });
    do {
      star.pos = vec2(randpom(worldSize), randpom(worldSize));
    } while (star.pos.sub(player.pos).length() < 1 * screen.maxBox/screen.minBox);
    stars.push(star);
  };
  
  const updateStars = () => {
    if (stars.length < (0|worldSize*worldSize*starDensity)) {
      spawnStar();
    }
  
    let i = 0;
    while (i < stars.length) {
      const star = stars[i];
      
      star.vel = star.vel.mul(0.99);
      star.pos = star.pos.add(star.vel);
      
      if (!star.active) {
        [stars[i], stars[stars.length-1]] = [stars[stars.length-1], stars[i]];      
        stars.pop();
      } else i++;
    }
  };
  
  const renderStars = () => {
    ctx.globalCompositeOperation = 'lighter';
    for (const star of stars) {
      ctx.beginPath();
      for (let a = 0; a < 2*PI; a+=2*PI/5) {
        ctx.lineTo(
          star.pos.x + starSize*cos(a+star.direction),
          star.pos.y + starSize*sin(a+star.direction),
        );
        ctx.lineTo(
          star.pos.x + 2/3*starSize*cos(a+PI/5+star.direction),
          star.pos.y + 2/3*starSize*sin(a+PI/5+star.direction),
        );
      }
      ctx.fillStyle = 'rgb(192, 192, 192)';
      ctx.fill();
    }
  };
  
  
  
  
  
  let ui = {
    play: {
      size: 0,
      direction: vec2(1, 0),
    },
  };
  ui.updatePlaySize = Sorder(ui.play, 'size', {
    frequency: 4,
    springiness: 0.25,
    response: 1,
  });
  ui.updatePlayDirection = Sorder(ui.play.direction, ['x', 'y'], {
    frequency: 1,
    springiness: 0.5,
    response: 2,
  });
  
  const thumbnail = () => {
    screen.handleDirtiness();
    background();
    ctx.save();
    ctx.translate(screen.center.x, screen.center.y);
    ctx.scale(screen.minBox*screen.zoom, screen.minBox*screen.zoom);
    ctx.translate(-screen.pos.x, -screen.pos.y);
    renderWorld(vec2(0.1, 0.2));
    
    updateEnemies();
    
    renderEnemies();
    ctx.restore();
    
  };
  
  let bulletCooldown = 0;
  let worldOffset = vec2(0, 0);
  const main = (dt, timeSinceStart) => {
    screen.handleDirtiness();
    background();
    
    updateMouse();
    
    ctx.save();
    ctx.translate(screen.center.x, screen.center.y);
    ctx.scale(screen.minBox*screen.zoom, screen.minBox*screen.zoom);
    ctx.translate(-screen.pos.x, -screen.pos.y);
    etx.save();
    etx.translate(screen.center.x, screen.center.y);
    etx.scale(screen.minBox*screen.zoom, screen.minBox*screen.zoom);
    etx.translate(-screen.pos.x, -screen.pos.y);
    
    const { a, b, c, d, e, f } = ctx.getTransform().invertSelf();
    const inWorld = vec2(
      a*mouse.pos.x + c*mouse.pos.y + e,
      b*mouse.pos.x + d*mouse.pos.y + f,
    );
    
    updateParticles();
    
    worldOffset = vec2(2, -1).normalize().mul(0.02).mul(timeSinceStart);
    renderWorld(worldOffset);
    renderMouse(inWorld);
    
    if (inWorld.sub(vec2(0, 0)).length() < 0.1) {
      const direction = inWorld.sub(vec2(0, 0)).normalize();
      player.direction.x = direction.x;
      player.direction.y = direction.y;
      ui.play.size = 1.15;
      if (mouse.isDown) {
        screen.page.setState('play');
        worldOffset = worldOffset.map(e => mod(e, 1/8))
      }
    } else {
      ui.play.size = 1;
      player.direction.x = 1;
      player.direction.y = 0;
    }
    ui.updatePlaySize(1/60);
    player.updateDirection(1/60);
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(0, 0, 0.1*ui.play.size, 0, 2*PI);
    ctx.fillStyle = '#888';
    const verts = pointsOnCircle(vec2(0, 0), 0.2/3*ui.play.size, 3, -player.direction.angle());
    ctx.moveTo(verts[0].x, -verts[0].y)
    for (const { x, y } of verts) {
      ctx.lineTo(x, -y);
    }
    ctx.closePath()
    ctx.fill();
    
    ctx.translate(0, -0.25);
    ctx.rotate(sin(2*PI*time/10)*0.1);
    
    ctx.font = '0.1px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#888';
    ctx.fillText(`ABERRATIUM`, 0, 0);
    
    renderParticles();
    
    ctx.restore();
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.font = '16px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText(`a little game by          (for Acerola Jam 0)`, 16, screen.height - 16 - 24*1);
    ctx.fillText(`have fun playing!`, 16, screen.height - 16 - 24*0);
    ctx.fillStyle = '#668';
    ctx.fillText(`                 Magnogen`, 16, screen.height - 16 - 24*1);
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(effectCanvas, 0, 0);
    
    etx.restore();
    
  };
  
  
  
  
  
  const game = (dt, timeSinceStart) => {
    const start = performance.now();
    if (time % 64 < 1/60) playSound('bg');
    
    screen.handleDirtiness();
    background();
    
    updateMouse();
    
    ctx.save();
    ctx.translate(screen.center.x, screen.center.y);
    ctx.scale(screen.minBox*screen.zoom, screen.minBox*screen.zoom);
    // ctx.scale(screen.minBox/6, screen.minBox/6);
    ctx.translate(-screen.pos.x, -screen.pos.y);
    etx.save();
    etx.translate(screen.center.x, screen.center.y);
    etx.scale(screen.minBox*screen.zoom, screen.minBox*screen.zoom);
    etx.translate(-screen.pos.x, -screen.pos.y);
    
    const { a, b, c, d, e, f } = ctx.getTransform().invertSelf();
    const inWorld = vec2(
      a*mouse.pos.x + c*mouse.pos.y + e,
      b*mouse.pos.x + d*mouse.pos.y + f,
    );
    
    worldOffset = worldOffset.mul(0.999);
    
    updatePlayer(inWorld);
    updateEnemies();
    updateStars();
    updateGems();
    updateBullets();
    updateParticles();
    
    bulletCooldown--;
    if (player.isAlive) {
      if (firingCooldown < 0) {
        do fire(); while (bulletCooldown-- > firingCooldown);
        if (bulletCooldown < firingCooldown) bulletCooldown = firingCooldown;
      } else {
        if (bulletCooldown < 0) {
          fire();
          bulletCooldown = firingCooldown;
        }
      }
    } else {
      if (bulletCooldown < -60*8) {
        bulletCooldown = 0;
        player.health = [1, 1, 1];
        player.pos = vec2(randpom(worldSize), randpom(worldSize));
        player.isAlive = true;
      } 
    }
    
    calculateBorder();
    
    renderWorld(worldOffset);
    renderPlayer();
    renderEnemies();
    renderStars();
    if (!invisibleBullets) renderBullets();
    renderGems();
    renderBorder();
    renderMouse(inWorld);
    
    ctx.restore();
    
    renderParticles();
    
    etx.restore();
    
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(effectCanvas, 0, 0);
    
    const end = performance.now();
    
    const total = end - start;
    
    let line = 1;
    ctx.font = '16px monospace';
    ctx.fillStyle = '#fff';
    // ctx.fillText(`calc dt      ${0|total}ms | ${0|(1000/total)} fps`, 16, 8 + line++ * 16);
    // ctx.fillText(`refreshRate  ${0|dt}ms | ${0|(1000/dt)} fps`, 16, 8 + line++ * 16);
    // ctx.fillText(`bulletCooldown  ${bulletCooldown}`, 16, 8 + line++ * 18);
    // ctx.fillText(`hello`, 16, 8 + line++ * 18);
  };
  
  let lastTime = 0;
  // tick()
  requestAnimationFrame(function _f (currentTime) {
    screen.page.call('tick', [currentTime - lastTime]);
    lastTime = currentTime;
    requestAnimationFrame(_f);
  });
  
})();