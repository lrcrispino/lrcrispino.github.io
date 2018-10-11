var animate = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  function(callback) { window.setTimeout(callback, 1000/60) };

var canvas = document.createElement('canvas');
var width = 700;
var height = 700;
canvas.width = width;
canvas.height = height;
var context = canvas.getContext('2d');

window.onload = function() {
  document.body.appendChild(canvas);
  animate(step);
};

var step = function() {
  update();
  render();
  animate(step);
};

var update = function() {
	for (var i = 0, len = balls.length; i < len; i++) {
  balls[i].update();
}
};

var balls = [];
balls[0]= new Ball(width/2, height/2);
var render = function() {
  context.fillStyle = "#F00000";
  context.fillRect(0, 0, width, height);
	for (var i = 0, len = balls.length; i < len; i++) {
  balls[i].render();
}
};

function Ball(x, y) {
  this.x = x;
  this.y = y;
  this.x_speed = (Math.random()*6)-3;
  if (Math.random() < .5){
	  this.y_speed = 3-Math.abs(this.x_speed);
  }
  else
  {
	  this.y_speed = -1*(3-Math.abs(this.x_speed));
  }
  this.radius = 5;
}

Ball.prototype.render = function() {
  context.beginPath();
  context.arc(this.x, this.y, this.radius, 2 * Math.PI, false);
  context.fillStyle = "#000000";
  context.fill();
};

Ball.prototype.update = function() {
  this.x += this.x_speed;
  this.y += this.y_speed;
  var left_edge = this.x - this.radius;
  var top_edge = this.y - this.radius;
  var right_edge = this.x + this.radius;
  var bottom_edge = this.y + this.radius;
  
    if(left_edge < 0) { // hitting the left wall
    this.x = this.radius;
    this.x_speed = -this.x_speed;
	balls.push (new Ball(width/2, height/2));
  } else if(right_edge > width) { // hitting the right wall
    this.x = width-this.radius;
    this.x_speed = -this.x_speed;
	balls.push (new Ball(width/2, height/2));
  }
    if(top_edge < 0) { // hitting the top wall
    this.y = this.radius;
    this.y_speed = -this.y_speed;
	balls.push (new Ball(width/2, height/2));
  } else if(bottom_edge > height) { // hitting the right wall
    this.y = height-this.radius;
    this.y_speed = -this.y_speed;
	balls.push (new Ball(width/2, height/2));
  }
};

