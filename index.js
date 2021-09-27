function random( min, max ) {
  var result = min + (max - min) * Math.random();
  return result;
}

function randomInt( min, max ) {
  // Math.round() gives a non-uniform distribution!
  var result = min + Math.floor((max - min + 1) * Math.random());
  return result;
}

var precision = 0.000000001;

function delta( num1, num2 ) {
  var diff = num1 - num2;
  var result = Math.abs(diff) < precision ? 0 : diff;
  return result;
}

function equal( num1, num2 ) {
  var result = delta(num1, num2) === 0;
  return result;
}

function lesser( num1, num2 ) {
  var result = num1 < num2 && ! equal(num1, num2);
  return result;
}

function lesserOrEqual( num1, num2 ) {
  var result = num1 < num2 || equal(num1, num2);
  return result;
}

function between( num, min, max, equalMin, equalMax ) {
  equalMin = typeof equalMin == 'undefined' ? true : !!equalMin;
  equalMax = typeof equalMax == 'undefined' ? true : !!equalMax;
  var result = true
      && (equalMin ? lesserOrEqual(min, num) : lesser(min, num))
      && (equalMax ? lesserOrEqual(num, max) : lesser(num, max));
  return result;
}

function straightLine( point1, point2 ) {
  //f(x,y) = a*x + b*y + c
  var a = delta(point1.position.y, point2.position.y);
  var b = delta(point2.position.x, point1.position.x);
  var c = point1.position.x*point2.position.y - point2.position.x*point1.position.y;
  function f( p ) {
      return a*p.position.x + b*p.position.y + c;
  }
  //y = m*x + k
  var isParallelToY = equal(b, 0);
  var mX = isParallelToY ? Nan : -(a/b);
  var kX = isParallelToY ? Nan : -(c/b);
  function yX( p ) {
      return mX*p.position.x + kX;
  }
  //x = m*y + k
  var isParallelToX = equal(a, 0);
  var mY = isParallelToX ? Nan : -(b/a);
  var kY = isParallelToX ? Nan : -(c/a);
  function xY( p ) {
      return mY*p.position.y + kY;
  }
  var angle = isParallelToY ? Math.PI/2 : Math.atan(mX);
  var cosAngle = Math.cos(angle);
  var sinAngle = Math.sin(angle);
  function compareParallel( pointP, axis, distance ) {
      axis = axis != 'y' && axis != 'x' ? 'y' : axis;
      distance = typeof distance == 'undefined' ? 0 : distance;
      switch (axis) {
          case 'x': //y is given
              if (isParallelToX) return Nan;
              var xYP = xY(pointP) + distance / Math.abs(sinAngle);
              if (lesser(pointP.position.x, xYP)) 
                  return -1;
              if (equal(pointP.position.x, xYP)) 
                  return 0;
              return +1;
          break;
          case 'y': //x is given
              if (isParallelToY) return Nan;
              var yXP = yX(pointP) + distance / Math.abs(cosAngle);
              if (lesser(pointP.position.y, yXP)) 
                  return -1;
              if (equal(pointP.position.y, yXP)) 
                  return 0;
              return +1;
          break;
          default:
          break;
      }
  }
  
  return {
      implicit: function() {
          return {a: a, b: b, c: c};
      },
      explicitX: function() {
          return {m: mX, k: kX, isParallelToY: isParallelToY, x: point1.position.x};
      },
      explicitY: function() {
          return {m: mY, k: kY, isParallelToX: isParallelToX, y: point1.position.y};
      },
      parallelAxis: function() {
          return isParallelToX ? 'x' : (isParallelToY ? 'y': '');
      },
      contains: function( pointP ) {
          return equal(f(pointP), 0);
      },
      compare: compareParallel
  };
}



game = new function() {

  //===============================================================READ ONLY==
  
  var spaceIsDown = false;
  this.isSpaceDown = function() {
      return spaceIsDown;
  };

  var playing = false;
  this.isPlaying = function() {
      return playing;
  };
  
  var context = null;
  this.getContext = function()
  {
      return context;
  };
  
  var ship = null;
  this.getShip = function()
  {
      return ship;
  };
  
  var level = 1;
  this.getLevel = function()
  {
      return level;
  };
  
  //==============================================================WRITE ONLY==
  
  var score = 0;
  this.incrementScore = function( value )
  {
      score += value;
  };
  
  var particles = [];
  this.addParticles = function( position, spread, seed, direction ) {
      var q = randomInt(seed, 2*seed);
      while (--q >= 0) {
          var p = new Particle(position, spread, q, direction);
          particles.push(p);
      }
  };
  
  //==================================================================PUBLIC==
  
  this.init = function() {

      canvas = document.getElementById('world');
      canvasBackground = document.getElementById('background-canvas');
      status = document.getElementById('status');
      message = document.getElementById('message');
      title = document.getElementById('title');
      startButton = document.getElementById('startButton');

      if (canvas && canvas.getContext) {
          context = canvas.getContext('2d');
          contextBackground = canvasBackground.getContext('2d');

          document.addEventListener('mousemove', documentMouseMoveHandler, false);
          canvas.addEventListener('touchstart', documentTouchStartHandler, false);
          document.addEventListener('touchmove', documentTouchMoveHandler, false);
          window.addEventListener('resize', windowResizeHandler, false);
          startButton.addEventListener('click', startButtonClickHandler, false);
          document.addEventListener('keydown', documentKeyDownHandler, false);
          document.addEventListener('keyup', documentKeyUpHandler, false);
          
          ship = new Ship(canvas.width/2, canvas.height/2);
          //shield = new Shield(Math.PI/2);

          windowResizeHandler();
          renderBackground();
          setInterval(loop, SECOND / FRAMERATE);
      }
  };
  
  var bullets = [];
  this.getBullets = function() {
      return bullets.concat();
  };
  this.addBullets = function( position, direction ) {
      var q = 2;
      while (--q >= 0) {
          var p = new Bullet(position, direction);
          bullets.push(p);
      }
  };
  
  //=================================================================PRIVATE==
  
  var SECOND = 1000;
  var FRAMERATE = 60;

  var canvas;
  var canvasBackground;
  var contextBackground;

  // UI DOM elements
  var status;
  var message;
  var title;
  var startButton;

  // Mouse properties
  var mouseX = 0;
  var mouseY = 0;
  var mouseIsDown = false;
  
  // Game properties
  var startTime = 0;
  var frameTime = 0;
  var organisms = [];
  var prevEnemyTime = 0;

  // Performance (FPS) tracking
  var fps = 0;
  var prevSecondTime = new Date().getTime();
  var frames = 0;
  
  function windowResizeHandler() {
      var left = (window.innerWidth - canvas.width) / 2;
      var top = (window.innerHeight - canvas.height) / 2;
      canvas.style.position = 'absolute';
      canvas.style.left = left + 'px';
      canvas.style.top = top + 'px';
      canvasBackground.style.position = 'absolute';
      canvasBackground.style.left = left + 'px';
      canvasBackground.style.top = top + 'px';
  }

  function renderBackground() {
      var gradient = contextBackground.createRadialGradient(
          canvas.width/2, canvas.height/2, 0, 
          canvas.width/2, canvas.height/2, 500);
      gradient.addColorStop(0, 'rgba(0, 70, 70, 1)');
      gradient.addColorStop(1, 'rgba(0, 8, 14, 1)');

      contextBackground.fillStyle = gradient;
      contextBackground.fillRect(0, 0, canvas.width, canvas.height);
  }

  //--------------------------------------------------------------------------
  
  function documentKeyDownHandler( event ) {
      switch (event.keyCode) {
      case 32:
          event.preventDefault();
          spaceIsDown = true;
          break;
      default:
          break;
      }
  }

  function documentKeyUpHandler( event ) {
      switch (event.keyCode) {
      case 32:
          event.preventDefault();
          spaceIsDown = false;
          break;
      default:
          break;
      }
  }

  function documentMouseMoveHandler( event ) {
      mouseX = event.clientX;
      mouseY = event.clientY;
  }

  function documentTouchStartHandler( event ) {
      if (event.touches.length == 1) {
          event.preventDefault();

          mouseX = event.touches[0].pageX;
          mouseY = event.touches[0].pageY;
      }
  }

  function documentTouchMoveHandler( event ) {
      if (event.touches.length == 1) {
          event.preventDefault();

          mouseX = event.touches[0].pageX;
          mouseY = event.touches[0].pageY;
      }
  }

  function startButtonClickHandler( event ) {
      event.preventDefault();
      if (!playing) {
          organisms = [];
          score = 0;
          level = 1;
          ship.energy = 30;
          message.style.display = 'none';
          status.style.display = 'block';
          startTime = new Date().getTime();
          playing = true;
      }
  }

  //--------------------------------------------------------------------------

  function drawParticles() {
      for (var i = 0, iTop = particles.length; i < iTop; i++) {
          p = particles[i];
          p.draw();
          if (p.alpha === 0) {
              particles.splice(i, 1);
              i--;
              iTop--;
          }
      }
  }

  function drawBullets() {
      for (var i = 0, iTop = bullets.length; i < iTop; i++) {
          p = bullets[i];
          p.draw();
          if (p.dead) {
              bullets.splice(i, 1);
              i--;
              iTop--;
          }
      }
  }

  function drawOrganisms() {
      var enemyCount = 0;
      var energyCount = 0;
      for (var i = 0, iTop = organisms.length; i < iTop; i++) {
          p = organisms[i];
          p.draw();
          if (p.dead) {
              p.explode();
              organisms.splice(i, 1);
              i--;
              iTop--;
          }
          else {
              if (p instanceof Enemy)  enemyCount++;
              if (p instanceof Energy) energyCount++;
          }
      }
      if (enemyCount < level && frameTime - prevEnemyTime > 100) {
          organisms.push(new Enemy());
          prevEnemyTime = frameTime;
      }
      if (energyCount < 1 && Math.random() > 0.996) {
          organisms.push(new Energy());
      }
  }
  
  function currentFPS() {
      frames++;
      if (frameTime > prevSecondTime + SECOND) {
          fps = frames / (frameTime - prevSecondTime) * SECOND;
          prevSecondTime = frameTime;
          frames = 0;
      }
      return fps;
  }
  
  /**
   * http://www.mredkj.com/javascript/numberFormat.html
   */
  function addCommas(nStr) {
      nStr += '';
      x = nStr.split('.');
      x1 = x[0];
      x2 = x.length > 1 ? '.' + x[1] : '';
      var rgx = /(\d+)(\d{3})/;
      while (rgx.test(x1)) {
          x1 = x1.replace(rgx, '$1' + ',' + '$2');
      }
      return x1 + x2;
  }
  
  function updateStatus() {
      var duration = ((frameTime - startTime) / SECOND);
      var text = 'Score: <span>' + addCommas(score.toFixed(0)) + '</span>';
      text += ' Time: <span>' + duration.toFixed(2) + 's</span>';
      text += ' Level: <span>' + level.toFixed(0) + '</span>';
      if (playing) {
          text += ' <p class="fps">FPS: <span>' + currentFPS().toFixed(0) + '</span></p>';
      }
      status.innerHTML = text;
  }

  function gameOver() {
      playing = false;
      updateStatus();
      title.innerHTML = 'Game Over!';
      message.style.display = 'block';
  }

  function loop() {
      frameTime = new Date().getTime();
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (playing) {
          level += 0.0015;
          score += 9 * level;
          ship.draw(mouseX, mouseY);
          if (spaceIsDown) {
              ship.fire();
          }
          drawBullets();
          updateStatus();
          if (ship.energy === 0) {
              ship.explode();
              gameOver();
          }
      }
      //draw organisms even if not playing, so that it works as a demo
      drawOrganisms();
      //draw partiles even if not playing, so that ship particles are drawn after game over
      drawParticles();
  }

};

//******************************************************************************

Point = Class.extend({
  init: function( x, y ) {
      this.context = game.getContext();
      this.position = {
          x: x || 0,
          y: y || 0
      };
  },
  distanceTo: function( p ) {
      var dx = p.position.x - this.position.x;
      var dy = p.position.y - this.position.y;
      return Math.sqrt(dx * dx + dy * dy);
  },
  scale: function( factor ) {
      factor = typeof factor == 'undefined' ? 1 : factor;
      
      var xP = this.position.x;
      var yP = this.position.y;
      var xPS = xP * factor;
      var yPS = yP * factor;
      var result = new Point(xPS, yPS);
      return result;
  },
  reverseScale: function( factor ) {
      factor = typeof factor == 'undefined' ? 1 : factor;
      
      var xPS = this.position.x;
      var yPS = this.position.y;
      var xP = xPS / factor;
      var yP = yPS / factor;
      var result = new Point(xP, yP);
      return result;
  },
  rotate: function( theta ) {
      theta = typeof theta == 'undefined' ? 0 : theta;
      
      var sin = Math.sin(theta);
      var cos = Math.cos(theta);
      var xP = this.position.x;
      var yP = this.position.y;
      var xPR =  xP * cos + yP * sin;
      var yPR = -xP * sin + yP * cos;
      var result = new Point(xPR, yPR);
      return result;
  },
  reverseRotate: function( theta ) {
      theta = typeof theta == 'undefined' ? 0 : theta;
      
      var sin = Math.sin(theta);
      var cos = Math.cos(theta);
      var xPR = this.position.x;
      var yPR = this.position.y;
      var xP = xPR * cos - yPR * sin;
      var yP = xPR * sin + yPR * cos;
      var result = new Point(xP, yP);
      return result;
  },
  translate: function( origin ) {
      origin = origin || new Point(0, 0);
      
      var xP = this.position.x;
      var yP = this.position.y;
      var xPT = xP - origin.position.x;
      var yPT = yP - origin.position.y;
      var result = new Point(xPT, yPT);
      return result;
  },
  reverseTranslate: function( origin ) {
      origin = origin || new Point(0, 0);
      
      var xPT = this.position.x;
      var yPT = this.position.y;
      var xP = xPT + origin.position.x;
      var yP = yPT + origin.position.y;
      var result = new Point(xP, yP);
      return result;
  },
  transformTRS: function( origin, theta, factor ) {
      /*
      var xP = pointP.position.x;
      var yP = pointP.position.y;

      origin = origin || new Point(0, 0);
      var xPT = xP - origin.position.x;
      var yPT = yP - origin.position.y;
      
      theta = typeof theta == 'undefined' ? 0 : theta;
      var sinTheta = Math.sin(theta);
      var cosTheta = Math.cos(theta);
      var xPTR =  xPT * cosTheta + yPT * sinTheta;
      var yPTR = -xPT * sinTheta + yPT * cosTheta;
      
      factor = typeof factor == 'undefined' ? 1 : factor;
      var xPTRS = factor * xPTR;
      var yPTRS = factor * yPTR;
      
      var result = new Point(xPTRS, yPTRS);
      return result;
      */
      var PT = this.translate(origin);
      var PTR = PT.rotate(theta);
      var PTRS = PTR.scale();
      return PTRS;
  },
  reverseTransformTRS: function( origin, theta, factor ) {
      var PTR = this.reverseScale(factor);
      var PT = PTR.reverseRotate(theta);
      var P = PT.reverseTranslate(origin);
      return P;
  }
});

//------------------------------------------------------------------------------

Ship = Point.extend({
  init: function( x, y ) {
      this._super(x, y);
      
      this.energy = 60;
      this.radius = 30;
      this.angle1 = 1/5*Math.PI;
      this.angle2 = 1/2*Math.PI;
      var X1 = this.radius * Math.sin(this.angle1/2);
      var X2 = this.radius * Math.sin(this.angle2/2);
      var Y1 = this.radius * Math.cos(this.angle1/2);
      var Y2 = this.radius * Math.cos(this.angle2/2);
      this.pointA = new Point(- X1, - Y1);
      this.pointB = new Point(+ X1, - Y1);
      this.pointC = new Point(+ X2, + Y2);
      this.pointD = new Point(- X2, + Y2);
      this.angle = 0;
      this.slDA = straightLine(this.pointD, this.pointA);
      this.slBC = straightLine(this.pointB, this.pointC);
      this.alpha = 0;
      this.head = new Point(0, this.pointA.position.y);
  },
  draw: function(mouseX, mouseY) {
      var targetAlpha = (this.energy / 100);
      this.alpha += (targetAlpha - this.alpha) * 0.2;
      
      var targetAngle = Math.atan2(mouseY - window.innerHeight/2, mouseX - window.innerWidth/2);
      targetAngle += 1/2*Math.PI;
      if (Math.abs(targetAngle - this.angle) > Math.PI) {
          this.angle = targetAngle;
      }
      else {
          this.angle += (targetAngle - this.angle) * 0.4;
      }
      this.context.save();
      
      this.context.translate(this.position.x, this.position.y);
      this.context.rotate(this.angle);
      
      this.context.beginPath();
      this.context.moveTo(this.pointA.position.x, this.pointA.position.y);
      this.context.lineTo(this.pointB.position.x, this.pointB.position.y);
      this.context.lineTo(this.pointC.position.x, this.pointC.position.y);
      this.context.lineTo(this.pointD.position.x, this.pointD.position.y);
      this.context.closePath();
      
      this.context.fillStyle = 'rgba( 36, 157, 147, ' + this.alpha + ' )';
      this.context.fill();
      
      this.context.lineWidth = 1.5;
      this.context.strokeStyle = "#3be2d4";
      this.context.stroke();
      
      this.context.restore();
  },
  increment: function( value ) {
      this.energy = Math.min(Math.max(this.energy + value, 0), 100);
  },
  isHitting: function( organism ) {
      var pointP = organism.transformTRS(this, this.angle);
      var size = organism.size/2;
      var result = between(pointP.position.y, this.pointA.position.y - size, this.pointD.position.y + size)
          && this.slDA.compare(pointP, 'x', -size) >= 0
          && this.slBC.compare(pointP, 'x', +size) <= 0;
      return result;
  },
  explode: function() {
      game.addParticles(this.position, 10, 40);
  },
  fire: function() {
      var head = this.head.reverseTransformTRS(this, this.angle);
      game.addBullets(this.position, {
          x: (head.position.x - this.position.x) * 0.2,
          y: (head.position.y - this.position.y) * 0.2
      });
  }
});

//------------------------------------------------------------------------------

Organism = Point.extend({
  init: function() {
      this.canvas = game.getContext().canvas;
      this.ship = game.getShip();
      
      var side = randomInt(0, 3);
      switch (side) {
      case 0:
          this._super(10, randomInt(0, this.canvas.height));
          break;
      case 1:
          this._super(randomInt(0, this.canvas.width), 10);
          break;
      case 2:
          this._super(this.canvas.width - 10, randomInt(0, this.canvas.height));
          break;
      case 3:
          this._super(randomInt(0, this.canvas.width), this.canvas.height - 10);
          break;
      default:
          break;
      }

      var speed = 0.006 * random(0.6, 0.75);
      this.velocity = {
          x: (this.ship.position.x - this.position.x) * speed,
          y: (this.ship.position.y - this.position.y) * speed
      };

      this.alpha = 0;
  },
  draw: function() {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.incrementAlpha((1 - this.alpha) * 0.1);
      
      this.context.beginPath();
      this.context.fillStyle = this.fillStyle();
      this.context.arc(this.position.x, this.position.y, this.size/2, 0, Math.PI*2);
      this.context.fill();

      this.checkAlive();
  },
  incrementAlpha: function( value ) {
      this.alpha = Math.min(Math.max(this.alpha + value, 0), 1);
  },
  isLost: function() {
      return false 
          || this.position.x < 0 - this.size || this.position.x > this.canvas.width  + this.size 
          || this.position.y < 0 - this.size || this.position.y > this.canvas.height + this.size;
  },
  checkAlive: function() {
      if (game.isPlaying()) {
          if (this.ship.isHitting(this)) {
              this.exchangeEnergy();
              this.dead = true;
          }
          var bullets = game.getBullets();
          for (var i = 0, iTop = bullets.length; i < iTop; i++) {
              var p = bullets[i];
              if (p.isHitting(this)) {
                  game.incrementScore(50);
                  this.dead = true;
              }
          }
      }
      if (this.isLost()) {
          this.dead = true;
      }
  },
  explode: function() {
      game.addParticles(this.position, 5, 5, {
          x: (this.position.x - this.ship.position.x) * 0.02,
          y: (this.position.y - this.ship.position.y) * 0.02
      });
  }
});

//------------------------------------------------------------------------------

Enemy = Organism.extend({
  init: function() {
      this._super();
      this.velocity.x *= random(1, 1.1);
      this.velocity.y *= random(1, 1.1);
      this.size = random(6, 10);
  },
  fillStyle: function() {
      return 'rgba( 255, 0, 0, ' + this.alpha + ' )';
  },
  exchangeEnergy: function() {
      game.getShip().increment(-6);
  }
});

//------------------------------------------------------------------------------

Energy = Organism.extend({
  init: function() {
      this._super();
      this.size = random(10, 16);
  },
  fillStyle: function() {
      return 'rgba( 0, 235, 190, ' + this.alpha + ' )';
  },
  exchangeEnergy: function() {
      game.getShip().increment(8);
      game.incrementScore(30);
  }
});

//------------------------------------------------------------------------------

Particle = Point.extend({
  init: function( position, spread, q, direction ) {
      this._super(
          position.x + (Math.sin(q) * spread), 
          position.y + (Math.cos(q) * spread));
      
      direction = typeof direction == 'undefined' ? {x: 0, y: 0} : direction;
      this.velocity = {
          x: direction.x + random(-1, 1),
          y: direction.y + random(-1, 1)
      };
      this.alpha = 1;
  },
  draw: function() {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.incrementAlpha(-0.02);
      
      this.context.fillStyle = "#FFFFFF";
      this.context.fillRect(this.position.x, this.position.y, 1, 1);
  },
  incrementAlpha: function( value ) {
      this.alpha = Math.min(Math.max(this.alpha + value, 0), 1);
  }
});

//------------------------------------------------------------------------------

Bullet = Point.extend({
  init: function( position, direction ) {
      this.canvas = game.getContext().canvas;
      
      this._super(position.x, position.y);
      this.velocity = {
          x: direction.x * 2,
          y: direction.y * 2
      };
      this.size = 2;
      this.dead = false;
  },
  draw: function() {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      
      this.context.fillStyle = 'rgba(255,255,255,1)';
      this.context.fillRect(this.position.x, this.position.y, this.size, this.size);
      
      this.checkAlive();
  },
  isLost: function() {
      return false 
          || this.position.x < 0 - this.size || this.position.x > this.canvas.width  + this.size 
          || this.position.y < 0 - this.size || this.position.y > this.canvas.height + this.size;
  },
  checkAlive: function() {
      if (this.isLost()) {
          this.dead = true;
      }
  },
  isHitting: function( organism ) {
      var result = this.distanceTo(organism) <= this.size/2 + organism.size/2;
      return result;
  }
});

//------------------------------------------------------------------------------

function init() {
  game.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
