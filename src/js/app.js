import './styles';
const THREE = require('three');
const Detector = require('three/examples/js/Detector');
THREE.OrbitControls = require('imports-loader?THREE=three!exports-loader?THREE.OrbitControls!../../node_modules\/three\/examples\/js\/controls\/OrbitControls');
THREE.ColladaLoader = require('imports-loader?THREE=three!exports-loader?THREE.ColladaLoader!../../node_modules\/three\/examples\/js\/loaders\/ColladaLoader');
const Stats = require('three/examples/js/libs/stats.min');
const dat = require('three/examples/js/libs/dat.gui.min');
const JSZip = require('jszip');

(() => {
  if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
  }

  let info = document.querySelector('.info');
  let loading = document.querySelector('.fetching');
  let unzipping = document.querySelector('.unzipping');

  unzipping.style.display = 'none';

  let container, stats, controls;
  let camera, scene, renderer, light;
  let bulbLight, bulbMat, hemiLight, floorMat;

  let bulbLuminousPowers = {
    "110000 lm (1000W)": 110000,
    "3500 lm (300W)": 3500,
    "1700 lm (100W)": 1700,
    "800 lm (60W)": 800,
    "400 lm (40W)": 400,
    "180 lm (25W)": 180,
    "20 lm (4W)": 20,
    "Off": 0
  };

  let hemiLuminousIrradiances = {
    "0.0001 lx (Moonless Night)": 0.0001,
    "0.002 lx (Night Airglow)": 0.002,
    "0.5 lx (Full Moon)": 0.5,
    "3.4 lx (City Twilight)": 3.4,
    "50 lx (Living Room)": 50,
    "100 lx (Very Overcast)": 100,
    "350 lx (Office Room)": 350,
    "400 lx (Sunrise/Sunset)": 400,
    "1000 lx (Overcast)": 1000,
    "18000 lx (Daylight)": 18000,
    "50000 lx (Direct Sun)": 50000
  };

  let params = {
    shadows: true,
    exposure: 0.68,
    bulbPower: Object.keys( bulbLuminousPowers )[ 4 ],
    hemiIrradiance: Object.keys( hemiLuminousIrradiances )[0]
  };

  init();

  function init() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 100 );
    camera.position.x = -4;
    camera.position.z = 4;
    camera.position.y = 2;


    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

    scene = new THREE.Scene();

    let bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 8 );
    bulbLight = new THREE.PointLight( 0xffee88, 1, 100, 2 );
    bulbMat = new THREE.MeshStandardMaterial( {
      emissive: 0xffffee,
      emissiveIntensity: 1,
      color: 0x000000
    });

    bulbLight.add( new THREE.Mesh( bulbGeometry, bulbMat ) );
    bulbLight.position.set( -2, 2, 2 );
    bulbLight.castShadow = true;
    scene.add( bulbLight );
    hemiLight = new THREE.HemisphereLight( 0xddeeff, 0x0f0e0d, 0.02 );
    scene.add( hemiLight );
    floorMat = new THREE.MeshStandardMaterial( {
      roughness: 0.8,
      color: 0xffffff,
      metalness: 0.2,
      bumpScale: 0.0005
    });

    let textureLoader = new THREE.TextureLoader();
    textureLoader.load( "models/hardwood2_diffuse.jpg", function( map ) {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.anisotropy = 4;
      map.repeat.set( 10, 24 );
      floorMat.map = map;
      floorMat.needsUpdate = true;
    });

    let floorGeometry = new THREE.PlaneBufferGeometry( 20, 20 );
    let floorMesh = new THREE.Mesh( floorGeometry, floorMat );
    floorMesh.receiveShadow = true;
    floorMesh.rotation.x = -Math.PI / 2.0;
    scene.add( floorMesh );

    stats = new Stats();
    container.appendChild( stats.dom );

    let manager = new THREE.LoadingManager();
    manager.onProgress = function( item, loaded, total ) {
      console.log( item, loaded, total );
    };

    let onProgress = (xhr) => {
      if ( xhr.lengthComputable ) {
        let percentComplete = xhr.loaded / xhr.total * 100;
        let percentageSpan = document.querySelector('.percentage');
        percentageSpan.innerHTML = Math.round(percentComplete, 2) + '%';
      }
    };

    let onError = (xhr) => {
      console.error(xhr);
    };

    let loader = new THREE.ColladaLoader();
    let zip = new JSZip();

    fetch('/models/scene/scene.dae.zip')
      .then(response => {
        loading.style.display = 'none';
        unzipping.style.display = 'block';

        if (response.status === 200 || response.status === 0) {
          return Promise.resolve(response.arrayBuffer());
        } else {
          return Promise.reject(new Error(response.statusText));
        }
      })
      .then(data => zip.loadAsync(data))
      .then(zipFile => zipFile.file('scene.dae').async('string'))
      .then(objData => {
        let data = loader.parse(objData);
        scene.add(data.scene);
        info.style.display = 'none';
      });

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0x050505 );
    renderer.physicallyCorrectLights = true;
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );
    let controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.target.set( 0, 0, 0 );
    controls.update();


    window.addEventListener('resize', onWindowResize, false );

    let gui = new dat.GUI();
    gui.add( params, 'hemiIrradiance', Object.keys( hemiLuminousIrradiances ) );
    gui.add( params, 'bulbPower', Object.keys( bulbLuminousPowers ) );
    gui.add( params, 'exposure', 0, 1 );
    gui.add( params, 'shadows' );
    gui.open();

    animate();
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }

  function animate() {
    requestAnimationFrame( animate );
    render();
  }

  function render() {
    renderer.toneMappingExposure = Math.pow( params.exposure, 5.0 ); // to allow for very bright scenes.
    renderer.shadowMap.enabled = params.shadows;
    bulbLight.castShadow = params.shadows;
    floorMat.needsUpdate = true;
    bulbLight.power = bulbLuminousPowers[ params.bulbPower ];
    bulbMat.emissiveIntensity = bulbLight.intensity / Math.pow( 0.02, 2.0 ); // convert from intensity to irradiance at bulb surface
    hemiLight.intensity = hemiLuminousIrradiances[ params.hemiIrradiance ];
    renderer.render( scene, camera );
    stats.update();
  }
})();
