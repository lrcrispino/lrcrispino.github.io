var animate = window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	function(callback) { window.setTimeout(callback, 1000/60) };

var div1 = document.createElement('div');
var span1 = document.createElement('span');
var canvas1 = document.createElement('canvas');
var canvas = document.createElement('canvas');
var canvas2 = document.createElement('canvas');
var canvas3 = document.createElement('canvas');
var width = 500;
var height = 800;
var speed = 1;
var accuracy = 1;
var damage = 1;
var timing = 0;
var rate = 1;
var size = 1;
var barheight = 30;
var level = 0;
var skill = 0;
var maxhp = 1;
var hp = maxhp;
var exp = 0;
var maxexp = 1;
span1.style = "display:inline-block;"
canvas.width = width;
canvas.height = height;
canvas.style = "display:block;"
canvas1.width = width;
canvas1.height = barheight;
canvas1.style = "display:block;"
canvas2.width = width;
canvas2.height = barheight;
canvas2.style = "display:block;"
canvas3.width = width;
canvas3.height = height+60;
var context = canvas.getContext('2d');
var expbar = canvas2.getContext('2d');
var hpbar = canvas1.getContext('2d');
var menu = canvas3.getContext('2d');

window.onload = function() {
	document.body.appendChild(span1);
	span1.appendChild(canvas1);
	span1.appendChild(canvas);
	span1.appendChild(canvas2);
	document.body.appendChild(canvas3);
	animate(step);
};

var step = function() {
  update();
	render();
	animate(step);
};

var update = function() {
  for (var i = 0, len = shots.length; i < len; i++) {
	var result = shots[i].update();
	if (result==1){
		len--;
		shots.splice(i,1);
 }
 	else if (result==2){
 		len--;
		shots.splice(i,1);
		hit();
 }
}
timing++;
if (timing > 60/rate){
	shots.push (new Shot(guy1.x, guy1.y-25));
	timing = 0;
}
};

var hit = function(){
	hp-=damage;
	if (hp <=0){
		maxhp +=1;
		hp = maxhp;
		exp+=1;
		enemy1.color=getRandomColor();
		if (exp >= maxexp){
			maxexp++;
			level++;
			skill++;
			exp=0;
		}
	}
}

var shots = [];
guy1 = new Guy(width/2,height - 30);
enemy1 = new Enemy(width/2, 50);
shots[0]= new Shot(guy1.x, guy1.y-25);

var render = function() {
	context.fillStyle = "#000000";
	context.fillRect(0, 0, width, height);
	hpbar.fillStyle = "#888888";
	hpbar.fillRect(0, 0, width, barheight);
	hpbar.fillStyle = "#FF0000";
	hpbar.fillRect(0, 0, width*(hp/maxhp), barheight);
	hpbar.font = "bold 30px Courier New";
	hpbar.fillStyle ="black";
	hpbar.textAlign = "center";
	hpbar.fillText(hp+"/"+maxhp,canvas1.width/2,25);
	expbar.fillStyle = "#888888";
	expbar.fillRect(0, 0, width,barheight);
	expbar.fillStyle = "#00FF00";
	expbar.fillRect(0, 0, width*(exp/maxexp),barheight);
	expbar.font = "bold 30px Courier New";
	expbar.fillStyle ="black";
	expbar.textAlign = "center";
	expbar.fillText("Level " + level,canvas2.width/2,25);
	menu.fillStyle = "white";
	menu.fillRect(0,0,500,860);
	menu.font = "bold 30px Courier New";
	menu.fillStyle ="black";
	menu.textAlign = "right";
	menu.fillText("Damage  " + damage,280,30);
	menu.fillText("Fire Rate  " + rate,280,60);
	menu.fillText("Shot Size  " + size,280,90);
	menu.fillText("Accuracy  " + accuracy,280,120);
	menu.fillText("Shot Speed  " + speed,280,150);
	menu.fillText("Skill Points  " + skill,280,200);
	for (var i = 0, len = shots.length; i < len; i++) {
		shots[i].render();
	}
	guy1.render();
	enemy1.render();
};

function getRandomColor() {
	var letters = '0123456789ABCDEF';
	var color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

function Shot(x, y) {
	this.x = x;
	this.y = y;
	this.x_speed = (Math.random()*((speed/accuracy)*2))-(speed/accuracy);
	this.y_speed = -speed;
	this.size = size;
	this.color ="#00FFFF";
}

Shot.prototype.render = function() {
context.beginPath();
	context.moveTo(this.x-this.size,this.y-this.size);
	context.lineTo(this.x+this.size,this.y-this.size);
	context.lineTo(this.x+this.size,this.y+this.size);
	context.lineTo(this.x-this.size,this.y+this.size);
	context.fillStyle = this.color;
	context.fill();
};

function Guy(x, y) {
	this.x = x;
	this.y = y;
	this.color = getRandomColor();
}

Guy.prototype.render = function() {
	context.beginPath();
	context.moveTo(this.x-10,this.y-20);
	context.lineTo(this.x+10,this.y-20);
	context.lineTo(this.x+10,this.y+20);
	context.lineTo(this.x-10,this.y+20);
	context.fillStyle = this.color;
	context.fill();
};

function Enemy(x, y) {
	this.x = x;
	this.y = y;
	this.color = getRandomColor();
}

Enemy.prototype.render = function() {
	context.beginPath();
	context.moveTo(this.x-25,this.y-25);
	context.lineTo(this.x+25,this.y-25);
	context.lineTo(this.x+25,this.y+25);
	context.lineTo(this.x-25,this.y+25);
	context.fillStyle = this.color;
	context.fill();
};

Shot.prototype.update = function() {
  this.x += this.x_speed;
	this.y += this.y_speed;
	var left_edge = this.x - this.size;
	var top_edge = this.y -  this.size;
	var right_edge = this.x +  this.size;
	var bottom_edge = this.y +  this.size;
	
		if(left_edge < 0) { // hitting the left wall
		return 1;
	}
	else if(right_edge > width) { // hitting the right wall
		return 1;
	}
	else if(top_edge < 0) {
		return 1; // hitting the top wall
	} 
	else if(top_edge < enemy1.y+25 && left_edge > enemy1.x-25 && left_edge < enemy1.x+25 ) {
		return 2;
	}
	else if(top_edge < enemy1.y+25 && right_edge > enemy1.x-25 && right_edge < enemy1.x+25 ) {
		return 2;
	}
	return 0; //nothing
	};

	function getMousePos(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}
//Function to check whether a point is inside a rectangle
function isInside(pos, rect){
    return pos.x > rect.x && pos.x < rect.x+rect.width && pos.y < rect.y+rect.height && pos.y > rect.y
}

//The rectangle should have x,y,width,height properties

var damagerect = {
    x:0,
    y:5,
    width:500,
    height:30
};
var raterect = {
    x:0,
    y:35,
    width:500,
    height:30
};
var sizerect = {
    x:0,
    y:65,
    width:500,
    height:30
};
var accuracyrect = {
    x:0,
    y:95,
    width:500,
    height:30
};
var speedrect = {
    x:0,
    y:125,
    width:500,
    height:30
};
//Binding the click event on the canvas
canvas3.addEventListener('click', function(evt) {
    var mousePos = getMousePos(canvas3, evt);

    if (skill > 0){
	    if (isInside(mousePos,damagerect)) {
	    	skill--;
	    	damage+=2;
	    }
	    else if(isInside(mousePos,raterect)){
	    	skill--;
	    	rate+=2;
	    }
	    else if(isInside(mousePos,sizerect)){
	    	skill--;
	    	size+=2;
	    }
	    else if(isInside(mousePos,accuracyrect)){
	    	skill--;
	    	accuracy+=2;
	    }
	    else if(isInside(mousePos,speedrect)){
	    	skill--;
	    	speed+=2;
	    }
	}
}, false);
