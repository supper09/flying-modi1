/* Simple Touch Fly Game
   - Touch/click and hold to move the player up
   - Release to fall (gravity)
   - Obstacles move left; touching an obstacle ends the game
   - Uses plain JS + DOM; styled with Tailwind via CDN in index.html
*/

(() => {
  const stage = document.getElementById('stage');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayScore = document.getElementById('overlay-score');
  const restartBtn = document.getElementById('restart');
  const startGameBtn = document.getElementById('startGame');
  const startScreen = document.getElementById('startScreen');
  const bgMusic = document.getElementById('bgMusic');
  const gameOverSound = document.getElementById('gameOverSound');

  const STAGE_W = 360; // virtual width for layout
  let stageRect = null;

  // High score management
  let highScore = parseInt(localStorage.getItem('flyingModiHighScore') || '0');
  highScoreEl.innerText = highScore;

  // Create player element
  const player = document.createElement('div');
  player.className = 'player absolute rounded-full shadow';
  player.style.width = '56px';
  player.style.height = '56px';
  player.style.left = '80px';
  player.style.top = '280px';
  player.style.backgroundImage = 'url(modi.jpg)';
  player.style.backgroundSize = 'cover';
  player.style.backgroundPosition = 'center';
  player.style.backgroundRepeat = 'no-repeat';
  player.style.userSelect = 'none';
  player.style.zIndex = '10';

  stage.appendChild(player);

  const state = {
    y: 280,
    vx: 0,
    vy: 0,
    pressing: false,
    running: false,
    obstacles: [],
    score: 0,
    lastObstacleAt: 0,
    speed: 1.5,
  };

  function resizeStage() {
    // Keep stage visually responsive while using a fixed virtual width
    const containerWidth = stage.clientWidth;
    const scale = containerWidth / STAGE_W;
    stageRect = stage.getBoundingClientRect();
    // scale used for collisions if needed
  }

  window.addEventListener('resize', resizeStage);
  resizeStage();

  // Pointer handling for both mouse and touch
  function onPointerDown(e) {
    e.preventDefault();
    state.pressing = true;
  }
  function onPointerUp(e) {
    e.preventDefault();
    state.pressing = false;
  }

  // Keyboard handling for spacebar
  function onKeyDown(e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      state.pressing = true;
    }
  }
  function onKeyUp(e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      state.pressing = false;
    }
  }

  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // prevent scrolling on touch inside stage
  stage.addEventListener('touchmove', (e) => e.preventDefault(), {passive:false});

  // Utility: create an obstacle pair (top and bottom) with a gap
  function createObstacle() {
    const gap = 350; // gap size - very large for much easier gameplay
    const minTop = 40;
    const maxTop = stage.clientHeight - gap - 90;
    const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
    const bottomHeight = stage.clientHeight - (topHeight + gap);

    // Dynamic width based on height with better scaling
    // Small heights get less width, medium stays ~90px, large gets much more width
    const getWidth = (height) => {
      if (height < 100) {
        // Very small - reduce width
        return Math.max(70, Math.floor(height * 0.3));
      } else if (height > 300) {
        // Very large - increase width even more
        return Math.floor(height * 0.8);
      } else {
        // Medium height - keep around 90px
        return 90;
      }
    };

    const topWidth = getWidth(topHeight);
    const bottomWidth = getWidth(bottomHeight);

    const x = stage.clientWidth + 20;

    const top = document.createElement('div');
    top.className = 'absolute obstacle-top';
    top.style.width = topWidth + 'px';
    top.style.height = topHeight + 'px';
    top.style.left = x + 'px';
    top.style.top = '0px';
    top.style.backgroundImage = 'url(Rahul.png)';
    top.style.backgroundSize = '100% 100%';
    top.style.backgroundPosition = 'center';
    top.style.backgroundRepeat = 'no-repeat';
    top.style.borderBottomLeftRadius = '12px';
    top.style.borderBottomRightRadius = '12px';
    top.style.zIndex = '10';

    const bottom = document.createElement('div');
    bottom.className = 'absolute obstacle-bottom';
    const bottomTop = topHeight + gap;
    bottom.style.width = bottomWidth + 'px';
    bottom.style.height = bottomHeight + 'px';
    bottom.style.left = x + 'px';
    bottom.style.top = bottomTop + 'px';
    bottom.style.backgroundImage = 'url(Rahul.png)';
    bottom.style.backgroundSize = '100% 100%';
    bottom.style.backgroundPosition = 'center';
    bottom.style.backgroundRepeat = 'no-repeat';
    bottom.style.borderTopLeftRadius = '12px';
    bottom.style.borderTopRightRadius = '12px';
    bottom.style.zIndex = '10';

    stage.appendChild(top);
    stage.appendChild(bottom);

    const obstacle = { top, bottom, x, topWidth, bottomWidth };
    state.obstacles.push(obstacle);
  }

  function resetGame() {
    // remove obstacles
    state.obstacles.forEach(o => {
      if (o.top.parentNode) o.top.parentNode.removeChild(o.top);
      if (o.bottom.parentNode) o.bottom.parentNode.removeChild(o.bottom);
    });
    state.obstacles = [];
    state.y = 280;
    state.vy = 0;
    state.pressing = false;
    state.running = true;
    state.score = 0;
    state.lastObstacleAt = performance.now();
    state.speed = 1.5;
    scoreEl.innerText = '0';
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none'; // Disable overlay during gameplay
    startScreen.style.display = 'none';
    player.style.transform = '';
    
    // Start background music
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log('Audio play failed:', e));
    
    requestAnimationFrame(loop);
  }

  function endGame() {
    state.running = false;
    
    // Check and update high score
    if (state.score > highScore) {
      highScore = state.score;
      localStorage.setItem('flyingModiHighScore', highScore.toString());
      highScoreEl.innerText = highScore;
      overlayTitle.innerText = 'New High Score!';
    } else {
      overlayTitle.innerText = 'Game Over';
    }
    
    // Stop background music
    bgMusic.pause();
    
    // Play game over sound
    gameOverSound.currentTime = 0;
    gameOverSound.play().catch(e => console.log('Game over sound failed:', e));
    
    // Show game over overlay with current score and high score
    overlayScore.innerHTML = `Score: ${state.score}<br><small class="text-gray-500">Best: ${highScore}</small>`;
    overlay.style.display = 'flex';
    overlay.style.pointerEvents = 'auto'; // Enable clicking on restart button
  }

  restartBtn.addEventListener('click', () => resetGame());
  startGameBtn.addEventListener('click', () => resetGame());

  // Basic AABB collision
  function isColliding(a, b) {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return !(ra.right < rb.left || ra.left > rb.right || ra.bottom < rb.top || ra.top > rb.bottom);
  }

  function loop(now) {
    if (!state.running) return;

    // physics
    const gravity = 0.5; // reduced from 0.9 for slower falling
    const lift = -1.0; // reduced from -1.8 for slower upward movement
    if (state.pressing) {
      state.vy += lift;
    } else {
      state.vy += gravity;
    }
    // damping
    state.vy *= 0.95; // increased damping for smoother movement
    state.y += state.vy;

    // clamp to stage
    const minY = 0;
    const maxY = stage.clientHeight - parseInt(player.style.height);
    if (state.y < minY) { state.y = minY; state.vy = 0; }
    if (state.y > maxY) { state.y = maxY; state.vy = 0; }

    player.style.top = state.y + 'px';

    // rotate slightly based on vy
    const angle = Math.max(-25, Math.min(25, state.vy * 3));
    player.style.transform = `rotate(${angle}deg)`;

    // obstacles movement and cleanup
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const o = state.obstacles[i];
      o.x -= state.speed;
      o.top.style.left = o.x + 'px';
      o.bottom.style.left = o.x + 'px';

      // if passed left edge, remove
      if (o.x + Math.max(o.topWidth, o.bottomWidth) < -20) {
        // remove DOM
        if (o.top.parentNode) o.top.parentNode.removeChild(o.top);
        if (o.bottom.parentNode) o.bottom.parentNode.removeChild(o.bottom);
        state.obstacles.splice(i,1);
        state.score += 1;
        scoreEl.innerText = state.score;
        // slowly increase speed
        state.speed += 0.02;
      }

      // collision check
      if (isColliding(player, o.top) || isColliding(player, o.bottom)) {
        endGame();
        return;
      }
    }

    // create new obstacle periodically
    if (now - state.lastObstacleAt > 3000) {
      createObstacle();
      state.lastObstacleAt = now;
    }

    requestAnimationFrame(loop);
  }

  // auto-start when the page is ready
  window.addEventListener('load', () => {
    resizeStage();
    // Don't auto-start the game, wait for user to click "Start Game"
  });

})();

