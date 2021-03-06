// ********************************************************************************
// - app.js

var SCREEN_WIDTH          = window.innerWidth;
var SCREEN_HEIGHT         = window.innerHeight;
var windowHalfX           = SCREEN_WIDTH / 2;
var windowHalfY           = SCREEN_HEIGHT / 2;

var camera, container, tick = 0, clock = new THREE.Clock(true), controls, scene, renderer, stats;

var cubes = []; var spheres = [];
var icosahedron, icosFrame, icosFrameGeom;

var palette = ["#ECF0F1", "#7877F9", "#3498DB", "#FFA446", "#7AA8FF"];
var notes = [ 54, 57, 62, 64, 66, 69, 73, 76, 78, 81 ];

var osc = new p5.SinOsc();
var envelope = new p5.Env();
var fft = new p5.FFT();
var amplitude = new p5.Amplitude();
var reverb = new p5.Reverb();
var spectrum, waveform;
var currFreq;
var colorCounter;

var isMinor = false;
var isMajor = true;

// ********************************************************************************
// - Initialization

function init() {
  // * Sound
  envelope.setADSR(0.15, 0.5, 0.1, 0.5);
  envelope.setRange(0.75, 0);

  reverb.process(osc, 5, 2);
  osc.amp(envelope);
  osc.start();

  // * Camera
  camera = new THREE.PerspectiveCamera(75, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 5000);
  camera.position.z = 1000;
  camera.position.y = windowHalfY;
  camera.position.x = windowHalfX;

  // * Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#fcf7e1', 0.0011); // 0xCCCCC fcf7e1

  // * Renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(scene.fog.color);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  container = document.getElementById('container');
  container.appendChild(renderer.domElement);

  // ******************************************************************************
  // - Trackball Controls

  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 2.0;
  controls.zoomSpeed = 1;
  controls.panSpeed = 1;
  controls.dampingFactor = 0.3;
  controls.minDistance = 600;
  controls.maxDistance = 1000;

  // ******************************************************************************
  // - Visuals

  // * Lines
  for (var i = 0; i < 300; i++) {
    var geometry = new THREE.Geometry();
    var vertex = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    vertex.normalize();
    vertex.multiplyScalar(500);
    geometry.vertices.push(vertex);

    var vertex2 = vertex.clone();
    vertex2.multiplyScalar(Math.random() * 0.3 + 1);
    geometry.vertices.push(vertex2);

    var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
      color: '#FFFFFF',
      linewidth: Math.random(3),
      transparent: true,
      fog: true,
      opacity: 0.25
    }));
    scene.add(line);
  }

  // * Icosahedron
  var icosGeometry = new THREE.OctahedronGeometry(350, 2);
  icosFrameGeom = new THREE.OctahedronGeometry(400, 2);

  var icosMaterial = new THREE.MeshPhongMaterial({ color: '#D92B6A', shading: THREE.FlatShading, vertexColors: THREE.FaceColors });
  var icosWire = new THREE.MeshPhongMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.2, wireframe: true });

  icosahedron = new THREE.Mesh(icosGeometry, icosMaterial);
  icosFrame = new THREE.Mesh(icosFrameGeom, icosWire);
  scene.add(icosahedron); scene.add(icosFrame);

  // * Icosahedral Verteces
  for (i in icosFrameGeom.vertices) {
    var sphereG = new THREE.SphereGeometry(5, 32, 32);
    var sphereM = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, shading: THREE.FlatShading});
    spheres.push(new THREE.Mesh(sphereG, sphereM));
    spheres[i].position.set(icosFrameGeom.vertices[i].x, icosFrameGeom.vertices[i].y, icosFrameGeom.vertices[i].z)
    scene.add(spheres[i]);
  }

  // * Polygons
  var polyGeometry = new THREE.CylinderGeometry(0, 10, 20, 4, 1);
  var polyMaterial =  new THREE.MeshPhongMaterial({ color: '#FFFFFF', shading: THREE.FlatShading });

  for (var i = 0; i < 100; i++) {
    var mesh = new THREE.Mesh( polyGeometry, polyMaterial );
    mesh.position.set((Math.random() - 0.5 ) * 1000, (Math.random() - 0.5 ) * 1000, (Math.random() - 0.5 ) * 1000)
    mesh.updateMatrix();
    // mesh.matrixAutoUpdate = false;
    // scene.add(mesh);
  }

  // * Cubes
  for (var i = 0; i < 255; i++) {
    var cubeGeometry = new THREE.CubeGeometry(15, 15, 15);
    var cubeMaterial = new THREE.MeshPhongMaterial({
      color: palette[Math.floor(Math.random() * palette.length)],
      specular: '#FFFFFF',
      shininess: 20,
      reflectivity: 1.5,
      shading: THREE.FlatShading,
      // wireframe: Math.random(1) > 0.8 ? true : false
    });

    cubes[i] = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cubes[i].position.set((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000);
    cubes[i].updateMatrix();
    scene.add(cubes[i]);
  }

  // ******************************************************************************
  // - Lights

  light = new THREE.DirectionalLight('#FFFFFF');
  light.position.set(1, 1, 1);
  scene.add(light);

  light = new THREE.DirectionalLight('#D92B6A');
  light.position.set(-5, -1, -10);
  scene.add(light);

  light = new THREE.AmbientLight('#222222');
  scene.add(light);

  var pointLight = new THREE.PointLight("#FFFFFF", 1.2, 200);
  pointLight.position.set(100, 100, 100);
  scene.add( pointLight );

  // ******************************************************************************
  // - Stats

  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  stats.domElement.style.zIndex = 100;
  // container.appendChild( stats.domElement );
}

// ******************************************************************************
// - Animation

function render() {
  // * Audio Analysis
  spectrum = fft.analyze();
  waveform = fft.waveform();

  volume = 0.005 + amplitude.getLevel() * 10;
  // console.log(volume);

  if (isMinor) {
    var gradientVariance = Math.floor(volume * 20);
    var red = 104 + gradientVariance;
    var green = 144 - gradientVariance;
    var blue = 219 - gradientVariance;

    var color = new THREE.Color("rgb(" + red + "," + green + "," + blue + ")");
    // console.log(color);
    renderer.setClearColor(scene.fog.color.lerp(color, 0.05));
    gradientVariance += colorCounter;
  } else {
    var gradientVariance = Math.floor(volume * 10);
    var red = gradientVariance;
    var green = Math.floor(gradientVariance / 10);
    var blue = gradientVariance;

    var color = new THREE.Color("rgb(252, 247, 225)");
    // console.log(color);
    renderer.setClearColor(scene.fog.color.lerp(color, 0.05));
    gradientVariance += colorCounter;
  }

  var delta = clock.getDelta();
  controls.update(delta);
  stats.update();

  tick += delta;
  if (tick < 0) tick = 0;
  if (delta > 0) {
    for(var i = 0; i < cubes.length; i++) cubes[i].scale.set(1 + volume * 0.15, 1 + volume * 0.25, 1 + volume * 0.35);

    icosahedron.scale.set(1 + volume * 0.05, 1 + volume * 0.05, 1 + volume * 0.05);
    icosahedron.rotation.x += 0.00001 + (volume * 0.00000025);

    icosFrame.scale.set(1 + volume * 0.05, 1 + volume * 0.05, 1 + volume * 0.05);
    icosFrame.rotation.x += 0.00001 + (volume * 0.00000025);

    icosFrame.material.opacity = volume / 10;

    for (i in spheres) {
      // spheres[i].material.opacity = volume / 5;
      spheres[i].scale.set(1 + volume * 0.05, 1 + volume * 0.05, 1 + volume * 0.05);
      spheres[i].rotation.x +=  0.00001 + (volume * 0.00000025);
      // spheres[i].position.z += volume;
    }
  }

  camera.position.x++;
  camera.position.y++;
  camera.lookAt(scene.position);

  // * Event Listeners
  document.addEventListener('touchstart', onTouchStart);
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousedown', onclick);
  document.addEventListener( 'mouseup', onMouseUp);

  // * Animate
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

// ******************************************************************************
// - Events

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onclick(e) {
  // e.preventDefault();
}

function onMouseUp(e) {
  // alert(e.pageX);
  playNote(notes[Math.floor(Math.random() * (6 - 0 + 1)) + 0]);
}

function onTouchStart(e) {
  if (e.touches.length === 1) {
    console.log(e.touches[0].pageX);
    e.preventDefault();
    playNote(notes[Math.floor(Math.random() * (10 - 0 + 1)) + 0]);
  }
}

// ******************************************************************************
// - Sound Helpers

function playNote(note) {
  osc.freq(midiToFreq(note));
  envelope.play(osc, 0, 0.1);
}

function midiToFreq(t) {
  currFreq = 440 * Math.pow(2, (t - 69) / 12);
  console.log('- Input: ' + t + ' - FF: ' + currFreq);
  return currFreq;
}

function toMinor() {
  isMinor = true;
  isMajor = false;
  notes = [ 57, 58, 61, 62, 64, 65, 69, 70, 74, 77 ];
}

function toMajor() {
  isMinor = false;
  isMajor = true;
  notes = [ 54, 57, 62, 64, 66, 69, 73, 76, 78, 81 ];
}

// ******************************************************************************
// - Init

init();
render();
