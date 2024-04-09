import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'stats-js'
import starmap from '/starmap.png'

const n = 3;

const scene = new THREE.Scene(); 
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); 
const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: "high-performance"}); 

const controller = {
	1: {pressed: false}, //+x
	2: {pressed: false}, //-x
	3: {pressed: false}, //+y
	4: {pressed: false}, //-y
	5: {pressed: false}, //+z
	6: {pressed: false}, //-z
}

document.addEventListener("keydown", (e) => {
	if(e.key == "ArrowRight"){
		controller[1].pressed = true;
	}
	if(e.key == "ArrowLeft"){
		controller[2].pressed = true;
	}
	if(e.key == "ArrowUp"){
		controller[3].pressed = true;
	}
	if(e.key == "ArrowDown"){
		controller[4].pressed = true;
	}
	if(e.key == "Shift"){
		controller[5].pressed = true;
	}
	if(e.key == "Enter"){
		controller[6].pressed = true;
	}
	if(e.key == " "){
		toggleWork();
	}
});
document.addEventListener("keyup", (e) => {
	if(e.key == "ArrowRight"){
		controller[1].pressed = false;
	}
	if(e.key == "ArrowLeft"){
		controller[2].pressed = false;
	}
	if(e.key == "ArrowUp"){
		controller[3].pressed = false;
	}
	if(e.key == "ArrowDown"){
		controller[4].pressed = false;
	}
	if(e.key == "Shift"){
		controller[5].pressed = false;
	}
	if(e.key == "Enter"){
		controller[6].pressed = false;
	}
});

// FPS tracker
var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
$("stats").appendChild( stats.dom );
stats.dom.style.position = "relative";

renderer.setSize(window.innerWidth, window.innerHeight); 
document.body.appendChild(renderer.domElement); 

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

renderer.setPixelRatio(window.devicePixelRatio);

const loader = new THREE.TextureLoader();
const stars = loader.load(
  starmap,
  () => {
	stars.mapping = THREE.EquirectangularReflectionMapping;
	stars.colorSpace = THREE.SRGBColorSpace;
	scene.background = stars;
});
const dark = new THREE.Color(0,0,0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

class Trail{
	constructor(pos, line){
		this.pos = pos;
		this.line = line;
	}
}

class Body{
	constructor(m, s, v, obj, test){
		this.m = m;
		this.s = new THREE.Vector3().copy(s);
		this.v = new THREE.Vector3().copy(v);
		this.obj = obj;
		this.test = test;
	}
}

const b = new Array();
const t = new Array();
const colors = Array(new THREE.LineBasicMaterial( { color: 0x8888ff, transparent: true, opacity: .9 } ), 
					 new THREE.LineBasicMaterial( { color: 0x88ff88, transparent: true, opacity: .9 } ),
					 new THREE.LineBasicMaterial( { color: 0xff8888, transparent: true, opacity: .9 } ));
const sphereGeos = new Array(new THREE.SphereGeometry(.25,8,8), 
							 new THREE.SphereGeometry(.05,8,8));
const sphereMats = Array(new THREE.MeshLambertMaterial( { color: 0xddddff, transparent: true, opacity: .9 } ), 
						 new THREE.MeshLambertMaterial( { color: 0xddffdd, transparent: true, opacity: .9 } ),
						 new THREE.MeshLambertMaterial( { color: 0xffdddd, transparent: true, opacity: .9 } ));

function bodyMake(){
	for(let i=0; i<n; i++){
		b.push(new Body(1, 
			new THREE.Vector3(5*i,0,0), 
			new THREE.Vector3(), 
			new THREE.Mesh(sphereGeos[0], sphereMats[i%3]),
			false));
		b[i].obj.receiveShadow = true;
		b[i].obj.castShadow = true;
		b[i].obj.position.copy(b[i].s);
		scene.add(b[i].obj);
	}
	controls.target.x = 5*(n-1)/2;
	camera.position.x = 5*(n-1)/2;
}

function trailMake(){
	for(let i=0; i<n; i++){
		t.push(new Trail(new Array(new THREE.Vector3().copy(b[i].s)),
			new THREE.Line(new THREE.BufferGeometry(), colors[i%3])));
		t[i].line.geometry.setFromPoints(t[i].pos);
		t[i].line.frustumCulled = false;
		scene.add(t[i].line);
	}
}

bodyMake();
trailMake();



//Create a DirectionalLight and turn on shadows for the light
const light = new THREE.DirectionalLight( 0xffffff, 1 );
light.position.set( 0, 2, 5 ); //default; light shining from top
light.castShadow = true; // default false
scene.add( light );

const light2 = new THREE.AmbientLight( 0x404040 ); // soft white light 
scene.add( light2 );


//Set up shadow properties for the light
light.shadow.mapSize.width = 512; // default
light.shadow.mapSize.height = 512; // default
light.shadow.camera.near = 0.5; // default
light.shadow.camera.far = 500; // default

scene.add(camera);
camera.position.z = 15; 

function animate() { 
	requestAnimationFrame(animate); 
	stats.begin();
	if(work){
		physics();
		cameraControl();
		trailControl();
		if(testing){ testMass();}
	}
	stats.end();
	renderer.render(scene, camera); 
}            

b[0].v.y = 0.1;
b[0].v.z = 0.1;
// b[1].m = 1.5;
b[2].v.y = -0.1;
b[2].v.x = -0.1;
function physics(){
    for(let i=0; i<n; i++){
		b[i].obj.position.add(b[i].v);
	}
	for(let i=0; i<n; i++){
		b[i].v.add(grav(i).multiplyScalar(1/(20*b[i].m)));
    }
}

function grav(o){
	let force = new THREE.Vector3();
	for(let i=0; i<n; i++){
		if(i!=o && !b[o].test){
			let o0 = new THREE.Vector3().copy(b[o].obj.position);
			let o1 = new THREE.Vector3().copy(b[i].obj.position);
			b[o].s.copy(b[o].obj.position);
			b[i].s.copy(b[i].obj.position);

			force.add(o1.add(o0.negate()).normalize().multiplyScalar(b[o].m*b[i].m/(b[o].s.distanceToSquared(b[i].s))));
		}
	}
	return force;
}

const lm = new THREE.Vector3();
let com = 0;
let vcom = new THREE.Vector3();
for(let i=0; i<n; i++){
	vcom.copy(b[i].v);
	lm.add(vcom.multiplyScalar(b[i].m));
	com += b[i].m;
}
lm.multiplyScalar(1/com)
function cameraControl(){
	controls.target.add(lm);
	camera.position.add(lm);
}

function trailControl(){
	for(let i=0; i<n; i++){
		t[i].pos.unshift(new THREE.Vector3().copy(b[i].obj.position));
		scene.children[i+n].geometry.setFromPoints(t[i].pos);
	}
}

let work = false;
let creative = true;
let showT = true;
let showO = true;
let showB = true;
let showPS = false;

$("begin").addEventListener("click", run);
$("b-s").addEventListener("click", toggleWork);
$("b-t").addEventListener("click", toggleTrails);
$("b-o").addEventListener("click", toggleObjects);
$("b-b").addEventListener("click", toggleBkg);
$("b-tm").addEventListener("click", addTestMass);
$("b-ps").addEventListener("click", toggleSetter);
$("setter").style.display = "none";
function run(){
	if(creative){
		$("begin").style.opacity = 0;
		$("control-panel").style.opacity = 1;
		setTimeout(animate, 1000);
		setTimeout(hide, 1000);
		creative = false;
	}
}
function hide(){
	$("begin").style.display = "none";
}
function toggleWork(){ work = !work; }
function toggleTrails(){ 
	showT = !showT;
	for(let i=n; i<2*n; i++){
		scene.children[i].visible = showT;
	}
}
function toggleObjects(){ 
	showO = !showO;
	for(let i=0; i<n; i++){
		scene.children[i].visible = showO;
	}
}
function toggleBkg(){
	showB = !showB;
	scene.background = showB ? stars : dark;
}
function toggleSetter(){
	showPS = !showPS;
	$("setter").style.display = showPS ? "block":"none";
}

let testIndex = b.length;
let testing = false;
function addTestMass(){
	testing = true;
	b.push(new Body(1, 
		new THREE.Vector3(-5,0,0), 
		new THREE.Vector3(0,0.05,0.05), 
		new THREE.Mesh(sphereGeos[1], new THREE.MeshLambertMaterial( { color: 0xffffff, transparent: true, opacity: 1 } ),
		true)));
	b[b.length-1].obj.position.copy(b[b.length-1].s);
	scene.add(b[b.length-1].obj);

	t.push(new Trail(new Array(new THREE.Vector3().copy(b[b.length-1].s)),
		new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial( { color: 0xffffff, transparent: true, opacity: .25 }))));
	t[t.length-1].line.geometry.setFromPoints(t[t.length-1].pos);
	t[t.length-1].line.frustumCulled = false;
	scene.add(t[t.length-1].line);
}

function testMass(){
	b[testIndex].obj.position.add(b[testIndex].v);
	b[testIndex].v.add(grav(testIndex).multiplyScalar(1/(20*b[testIndex].m)));

	t[testIndex].pos.unshift(new THREE.Vector3().copy(b[testIndex].obj.position));
	scene.children[scene.children.length-1].geometry.setFromPoints(t[testIndex].pos);
}


function genSlider(i){
	$("setter").innerHTML += `<div class="slider-wrap"><span class = "m-l l col-${i%3}">m<sub>${i+1}</sub></span><input type="range" min="0.1" max="9.9" step = "0.1" value="1" class="slider" id="input-s-${i}"><span id = "input-n-${i}" class = "number l col-${i%3}">1.0</span></div>`;

}

for(let i=0; i<n; i++){
	genSlider(i);
}  
for(let i=0; i<n; i++){
	$(`input-s-${i}`).addEventListener("input", function(){ $(`input-n-${i}`).innerHTML = Number($(`input-s-${i}`).value).toFixed(1); b[i].m = Number($(`input-s-${i}`).value)});
}  


function $(x){
	return document.getElementById(x);
}

// TODO:
// keyboard flying around
// better test masses
// user input
// more optimization