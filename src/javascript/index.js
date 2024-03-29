// THREE
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

// Classes
require('./Utils/TweenMax.min.js');

// Constants
global.THREE = THREE;
const CAMERA_POSITIONS = {
    first_look: {
        x: 10.7,
        y: 169.50,
        z: 1071
    },
    free_view: {
        x: -974,
        y: 347,
        z: 398,
        duration: 3
    },
    dimensions: {
        x: 1070,
        y: 170,
        z: -40,
        duration: 5
    },
    sunroof: {
        x: 847,
        y: 436,
        z: 517,
        duration: 5
    },
    head_light: {
        x: -5.5,
        y: 170,
        z: 1071,
        duration: 5
    },
    rear_light: {
        x: 29,
        y: 170,
        z: -1071,
        duration: 5
    },
    wheel_rings: {
        x: 635,
        y: 170,
        z: -862,
        duration: 5
    },
}

const CAR_COLORS ={
    "black": new THREE.MeshBasicMaterial({
      color: 0x000000
    }),
    "blue": new THREE.MeshBasicMaterial({
      color: 0x001969
    }),
    "red": new THREE.MeshBasicMaterial({
      color: 0xc40000
    })
  }

// ground texture
let texture;
let car_objects = [];
class WebGL {
    constructor(_options) {
        // variables
        this.$canvas = _options.canvas;
        this.proccess = document.getElementById("progressbar_thumb")
        this.lights = [];
        this.content = null;
        this.carObjects = [];
        this.currentControl = null;

        // state
        this.state = {
            carLoaded: false,
            wheelsCanRotate: false,
            wheelSpeed: 0.1,
            addLights: true,
            envMapIntensity: 1,
            emissiveIntensity: 3,
            refractionRatio: 0,
            metalness: 0.5,
            roughness: 0,
            exposure: 1.3,
            textureEncoding: 'sRGB',
            steerDirection: "",
            isDay: true,
            driveMode:false,
            backLightsOnColor: new THREE.Color(0xFFFFFF),
            backLightsOffColor: new THREE.Color(0x000000),
            dayLightColor: new THREE.Color(0xFFFFFF),
            nightLightColor: new THREE.Color(0x333333),
            backgroundLight: 1,
            active_sidebar:""
        };

        this.prevTime = 0;

        // Scene
        this.scene = new THREE.Scene();



        // Camera
        const fov = 60;
        this.camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.01, 1000);
        this.camera.setFocalLength(this.camera.getFocalLength() + 10);
        this.scene.add(this.camera);
        this.scene.add(new THREE.AxisHelper(100));
        // this.cameraAngle = (Math.atan2(this.camera.getWorldDirection().x, this.camera.getWorldDirection().z)) * 180 / Math.PI

        // Renderer
        this.renderer = window.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.$canvas });
        this.renderer.physicallyCorrectLights = true;
        this.renderer.gammaOutput = true;
        this.renderer.gammaFactor = 2.2;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.setClearColor(0xcccccc);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enabled = false;
        this.controls.autoRotate = false;
        this.controls.enablePan = false;
        this.controls.enableKeys = false;
        this.controls.enableDamping = true;
        this.controls.screenSpacePanning = true;
        this.controls.maxPolarAngle = 0.9 * Math.PI / 2;
        this.controls.dampingFactor = 0.05;

        // Background
        this.addBackgroundEnv();

        // Animate
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Resize listener
        window.addEventListener('resize', this.resize.bind(this), false);

        // Start Loading
        this.load();

        // Listen for controls
        this.setControlsListener();

    }

    animate(time) {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.checkCameraPosition();
        this.render();
        if (this.carObjects.length && this.state.driveMode==true) {
            texture.offset.x += 0.01;
            this.rotateWheels();
        }

        this.prevTime = time;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    resize() {
        const width = window.innerWidth, height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

    }

    load() {
        // Draco
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('draco/')
        dracoLoader.setDecoderConfig({ type: 'js' })

        // GLTF
        const gltfLoader = new GLTFLoader()
        gltfLoader.setDRACOLoader(dracoLoader)
        gltfLoader.setCrossOrigin('anonymous')

        const file = "final.glb";
        gltfLoader.load(file, (gltf) => {

            const scene = gltf.scene || gltf.scenes[0];
            this.setContent(scene);

        }, (xhr) => {
            var percent = (xhr.loaded / xhr.total * 100);
            this.proccess.style.width = `${percent}%`;
        }, (error) => {
            console.error("Error: ", error)
        });

    }

    //remove object in certain degrees
    checkCameraPosition(){
      if (this.carObjects.length){
        let cam_x_pos = Math.round(this.camera.position.x);
        let cam_y_pos = Math.round(this.camera.position.y);
        let cam_z_pos = Math.round(this.camera.position.z);
        if(cam_x_pos < 0 && cam_x_pos > -50){
          // console.log("hide it")
        }
      }
    }

    //create env and add objects to it
    setContent(object) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3()).length();
        const center = box.getCenter(new THREE.Vector3());

        object.position.x = 0 // += (object.position.x - center.x);
        object.position.y = 0 // += (object.position.y - center.y);
        object.position.z = 0 // += (object.position.z - center.z);

        this.controls.minDistance = size / 1.5;
        this.controls.maxDistance = size * 1;

        this.camera.near = size / 100;
        this.camera.far = size * 100;
        this.camera.updateProjectionMatrix();

        const { x, y, z } = CAMERA_POSITIONS.first_look;
        this.camera.position.set(x, y, z);
        this.camera.lookAt(center);

        /* add car object */
        this.scene.add(object);
        this.content = object;

        this.initPlane();

        /* add shadow image */
        this.initiShadow(size);

        this.addLights();

        this.updateEnvironment();

        // set car objects
        this.state.carLoaded = true;
        this.setCarObjects();

        // Animate car position
        this.updateCameraPositon(CAMERA_POSITIONS.free_view, {
            delay: 1
        });

        // remove loading bar
        setTimeout(() => {
            document.getElementById("preload_screen").style.display = "none";
        }, 500)
    }

    initPlane() {
        texture = new THREE.TextureLoader().load("floor.jpg");
        // texture.offset.y = this.state.wheelSpeed;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(100, 100);

        const planeMaterial = new THREE.MeshLambertMaterial({ map: texture,transparent:true,opacity:0.5 });
        const planeGeometry = new THREE.PlaneBufferGeometry(20000, 20000,1,1);

        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.y = this.content.position.y - 177;
        plane.rotation.x = - Math.PI / 2;
        plane.receiveShadow = true;
        this.scene.add(plane);
    }

    initiShadow(size) {
        // Texture
        const shadowTexture = new THREE.TextureLoader().load("shadow.jpg");

        // Plane
        const shadowPlane = new THREE.PlaneBufferGeometry(size * 1.1, size * 1.1);
        shadowPlane.rotateX(-Math.PI / 2);
        shadowPlane.rotateY(Math.PI / 2);
        shadowPlane.translate(1.56, 0, 0);

        // Material
        const shadowMaterial = new THREE.MeshBasicMaterial({
            map: shadowTexture,
            blending: THREE.MultiplyBlending,
            transparent: true,
        });

        // Mesh
        const shadowMesh = new THREE.Mesh(shadowPlane, shadowMaterial);
        shadowMesh.position.y = this.content.position.y - 180;
        shadowMesh.position.z = this.content.position.z + 0;
        shadowMesh.rotation.y = Math.PI / 2;
        this.scene.add(shadowMesh)
    }

    updateLights() {
        const lights = this.lights;

        if (lights.length) {
            this.removeLights();
            this.addLights();
        } else {
            this.addLights();
        }

        this.renderer.toneMappingExposure = this.state.exposure;
    }

    addLights() {
        const lightColor = this.state.isDay ? this.state.dayLightColor : this.state.nightLightColor;

        // light 1
        const light1 = new THREE.AmbientLight(lightColor, 1);
        light1.name = 'ambient_light_1';
        this.camera.add(light1);

        // light 2
        const light2 = new THREE.AmbientLight(lightColor, 0.5);
        light2.name = 'ambient_light_2';
        this.camera.add(light2);

        this.lights.push(light1, light2);
    }

    removeLights() {
        this.lights.forEach((light) => light.parent.remove(light));
        this.lights.length = 0;
    }

    addBackgroundEnv() {
        this.background = new THREE.CubeTextureLoader()
            .setPath("environment/envSky/")
            .load([
                'px.jpg',
                'nx.jpg',
                'py.jpg',
                'ny.jpg',
                'pz.jpg',
                'nz.jpg'
            ]);
        this.scene.background = this.background; // new THREE.Color(0x333333)
    }

    updateEnvironment() {
        const ignore = [
            "lastic",
            "dakhele_mashin",
        ];
        this.content.position.y=-170;
        this.content.rotateY(Math.PI/2)

        this.getCubeMapTexture().then(({ envMap }) => {
            this.content.traverse((child) => {
                if ( child.isMesh ) {
                    child.material.envMap  = envMap;
                    child.material.envMapIntensity =1;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material.needsUpdate = true;

                    if(child.material.name == "lastic"){
                      child.material.needsUpdate = true;
                      child.material.envMap  = envMap;
                    }

                    if(child.material.name == "rang_badane_mashin"){
                        child.material.needsUpdate=true;
                        child.material.envMap  = envMap;
                        child.material.envMapIntensity =1;
                        child.material.metalness=0.02;
                        child.material.reflectivity=0.05;
                        child.material.roughness=0.04;
                        child.material.side=2;
                        child.renderOrder=1;
                    }

                    if(child.name == "Shishe_jelo"){
                        child.material.needsUpdate=true;
                        child.material.envMap  = envMap;
                        child.material.envMapIntensity =1;
                        child.material.metalness=0;
                        child.material.reflectivity=0.5;
                        child.material.roughness=0;
                        child.material.side=2;
                    }

                    if(child.name == "shise_cheragh_jelo" && child.material.name=="shishe_cheragh_jelo"){
                        child.material.opacity=1;
                        child.material.metalness=0;
                        child.material.reflectivity=1;
                        child.material.roughness=0;
                        child.material.transmission=0.9;
                        child.material.needsUpdate=true;

                        // add glow left
                        // child.add( headlight_flare_right );
                        // headlight_flare_right.position.z =55;
                        // headlight_flare_right.position.x =125;
                        // headlight_flare_right.position.y =5;
                        // headlight_flare_right.lookAt(camera.position)
                        // child.add(headlight_flare_right)

                        // add glow right
                        // child.add( headlight_flare_left );
                        // headlight_flare_left.position.z =55;
                        // headlight_flare_left.position.x =-125;
                        // headlight_flare_left.position.y =5;
                        // headlight_flare_left.lookAt(camera.position)
                        // child.add(headlight_flare_left)


                    }

                    if(child.name == "cheragh_rahnama_jelo"){
                      child.material.needsUpdate=true;
                      child.material.emissive=new THREE.Color("rgb(255,51, 0)");

                    }

                    if(child.name=="ring"){
                      child.material.needsUpdate=true;
                      child.material.color=new THREE.Color("rgb(75,75, 75)");
                      child.material.roughness = 0.3;
                      child.material.metalness = 0.6;
                      child.material.reflectivity = 0.4;
                    }
                  }
            });

        });

        this.updateTextureEncoding();
    }

    getCubeMapTexture() {
        return new Promise((resolve) => {
            const envMap = new THREE.CubeTextureLoader()
                .setPath("environment/envReflection/")
                .load([
                    'px.jpg',
                    'nx.jpg',
                    'py.jpg',
                    'ny.jpg',
                    'pz.jpg',
                    'nz.jpg'
                ]);
            envMap.format = THREE.RGBFormat;
            resolve({ envMap, cubeMap: envMap })
        })
    }

    updateTextureEncoding() {
        // const encoding = this.state.textureEncoding === 'sRGB' ? THREE.sRGBEncoding : THREE.LinearEncoding;
        const encoding = THREE.sRGBEncoding;
        this.traverseMaterials(this.content, (material) => {
            if (material.map) material.map.encoding = encoding;
            if (material.emissiveMap) material.emissiveMap.encoding = encoding;
            if (material.map || material.emissiveMap) material.needsUpdate = true;
        });
    }

    updateCameraPositon(position, _options) {
        const { x, y, z, duration = 2 } = position;
        const gsap = require("gsap").gsap;

        gsap.to(this.camera.position, {
            x,
            y,
            z,
            duration,
            ease: "expo.out",
            onStart: () => {
                if (this.controls.enabled) {
                    this.controls.enabled = false;
                    this.controls.update();
                }
            },
            onComplete: () => {
                this.camera.updateProjectionMatrix();
                if (!this.controls.enabled) {
                    this.controls.enabled = true;
                    this.controls.update();
                }
            },
            ..._options
        })
    }

    setCarObjects() {
        [
            "WheelBR",
            "WheelBL",
            "WheelFR",
            "WheelFL",
            "Cheagh_jelo",
            "lastik",
            "shishe_ghrmez",
            ""
        ].map((name) => {
            this.content.traverse((node) => {
                if(node.name === name || node.name.toLowerCase().includes(name) && node.name !== "lastik_saghf"){
                    this.carObjects.push(node);
                    car_objects.push(node);
                }
            });
        });
    }

    setControlsListener() {
        document.querySelector("button").addEventListener("click", () =>this.close_all(), false);
        document.querySelector("#part_panel").addEventListener("click", () =>this.open_sidebar('part'), false);
        document.querySelector("#color_panel").addEventListener("click", () =>this.open_sidebar('color'), false);
        document.querySelectorAll(".color_button").forEach(el=>{
            el.addEventListener("click",()=>this.change_car_paint(el),false)
        })
        document.querySelector("#rear_light").addEventListener("click",()=>this.change_view('rear_light'),false)
        document.querySelector("#head_light").addEventListener("click",()=>this.change_view('front_light'),false)
        document.querySelector("#sunroof").addEventListener("click",()=>this.change_view('sunroof'),false)
        document.querySelector("#wheel_rings").addEventListener("click",()=>this.change_view('wheel_rings'),false)
        document.querySelector("#free_view").addEventListener("click",()=>this.change_view('free_view'),false)
        document.querySelector("#drive").addEventListener("click",()=>this.state.driveMode = !this.state.driveMode,false)
    }

    turnSteering(direction) {
        const gsap = require("gsap").gsap;
        if (!this.carObjects.length) return;

        const wheelFL = this.carObjects.filter((object) => object.name === "WheelFL")[0];
        const wheelFR = this.carObjects.filter((object) => object.name === "WheelFR")[0];
        const wheelBL = this.carObjects.filter((object) => object.name === "WheelBL")[0];
        const wheelBR = this.carObjects.filter((object) => object.name === "WheelBR")[0];

        function removeRotation() {
            gsap.to(wheelFL.rotation, {
                y: 0
            })
            gsap.to(wheelFR.rotation, {
                y: 0
            })
            gsap.to(wheelBL.rotation, {
                y: 0
            })
            gsap.to(wheelBR.rotation, {
                y: 0
            })
        }

        switch (direction) {
            case "left":
                if (this.state.steerDirection === "left") {
                    removeRotation()
                    this.state.steerDirection = "";
                } else {
                    gsap.to(wheelFL.rotation, {
                        y: -0.5
                    })
                    gsap.to(wheelFR.rotation, {
                        y: -0.5
                    })
                    gsap.to(wheelBL.rotation, {
                        y: -0.1
                    })
                    gsap.to(wheelBR.rotation, {
                        y: -0.1
                    })
                    this.state.steerDirection = "left";
                }
                break;
            case "right":
                if (this.state.steerDirection === "right") {
                    removeRotation()
                    this.state.steerDirection = "";
                } else {
                    gsap.to(wheelFL.rotation, {
                        y: 0.5
                    })
                    gsap.to(wheelFR.rotation, {
                        y: 0.5
                    })
                    gsap.to(wheelBL.rotation, {
                        y: 0.1
                    })
                    gsap.to(wheelBR.rotation, {
                        y: 0.1
                    })
                    this.state.steerDirection = "right";
                }
                break;
            case "center":
                removeRotation()
                this.state.steerDirection = "";
                break;
            default:
                break;
        }
    }

    floatedBpx(name, status) {
        const dimensions_box = document.getElementById("dimensions_box");
        const aerodynamics_box = document.getElementById("aerodynamics_box");

        switch (name) {
            case "dimensions":
                if (status === "show") {
                    dimensions_box.style.opacity = "1";
                    dimensions_box.style.pointerEvents = "all";
                } else {
                    dimensions_box.style.opacity = "0";
                    dimensions_box.style.pointerEvents = "none";
                }
                break;
            case "aerodynamics":
                if (status === "show") {
                    aerodynamics_box.style.opacity = "1";
                    aerodynamics_box.style.pointerEvents = "all";
                } else {
                    aerodynamics_box.style.opacity = "0";
                    aerodynamics_box.style.pointerEvents = "none";
                }
                break;
            default:
                break;
        }
    }

    headFlares() {
        const cheagh_jelo = this.carObjects.filter((object) => object.name === "Cheagh_jelo")[0];
        const shishe = cheagh_jelo.children.filter((object) => object.name === "shishe")[0];
        shishe.emissive = 0xffffff;

        // RectAreaLightUniformsLib.init();
        // const rectLight = new THREE.RectAreaLight(0xffffff, 3, 10, 10);
        // rectLight.position.set( shishe.position );
        // rectLight.name = "cheragh_jelo_light";
        // shishe.add(rectLight)
        // this.scene.add(rectLight);


    }

    rotateWheels() {
        const LF = this.carObjects.filter((object) => object.name === "lastic")[0];
        const RF = this.carObjects.filter((object) => object.name === "lastic")[1];
        const LB = this.carObjects.filter((object) => object.name === "lastic1")[0];
        const RB = this.carObjects.filter((object) => object.name === "lastic1")[1];
        LF.parent.rotation.x+=0.05;
        RF.parent.rotation.x+=0.05;
        LB.parent.rotation.x+=0.05;
        RB.parent.rotation.x+=0.05;
        // this.carObjects.filter((object) => object.name === "Lastic")[0].parent.rotation.x+=0.01;
        // this.carObjects.filter((object) => object.name === "Lastic")[1].parent.rotation.x+=0.01;
        // this.carObjects.filter((object) => object.name === "Lastic1")[2].parent.rotation.x+=0.01;
        // this.carObjects.filter((object) => object.name === "Lastic1")[3].parent.rotation.x+=0.01;
    }

    traverseMaterials(object, callback) {
        object.traverse((node) => {
            if (!node.isMesh){
              return;
            }

            const materials = Array.isArray(node.material)
                ? node.material
                : [node.material];
            materials.forEach(callback);
        });
    }

    open_sidebar(title){
        this.state.active_sidebar = title;
        if(title == "part"){
          this.close_sidebar("color")
          document.querySelector(".gui__sidebar--part").style.transform = "translate3d(0px, 0px, 0px)";
        }else{
          this.close_sidebar("part")
          document.querySelector(".gui__sidebar--color").style.transform = "translate3d(0px, 0px, 0px)";
        }

        document.querySelector("#canvas").classList.add("sidebar_opened")
        document.querySelector(".gui__footer").classList.add("sidebar_opened")
    }
    close_sidebar(title){
        if(title == "part"){
          document.querySelector(".gui__sidebar--part").style.transform = "translate3d(100%, 0px, 0px)";
        }else{
          document.querySelector(".gui__sidebar--color").style.transform = "translate3d(100%, 0px, 0px)";
        }
    }
    close_all(){
        document.querySelector(`.gui__sidebar--${this.state.active_sidebar}`).style.transform = "translate3d(100%, 0px, 0px)";
        document.querySelector("#canvas").classList.remove("sidebar_opened")
        document.querySelector(".gui__footer").classList.remove("sidebar_opened")
    }
    change_car_paint(element){
        document.querySelector('circle.active').classList.remove("active");
        document.querySelector(`circle.circ_${element.dataset.color_name}`).classList.add('active');
        const body = this.carObjects.filter(part=>{
          return part.name == "badane_mashin"
        })[0];
        this.colorTo(body,CAR_COLORS[element.dataset.color_name]);

    }
    colorTo(meshBody, newColor) {
        let target = meshBody
        let initial = new THREE.Color(target.material.color.getHex());
        let value = new THREE.Color(newColor.color.getHex());
        TweenLite.to(initial, 0.5, {
          r: value.r,
          g: value.g,
          b: value.b,
          onStart: function(){
            target.material.color = initial;
          },
          onComplete: function(){
            target.material.color = value;
          },
          onUpdate: function () {
          }
        });
    }
    change_view(view_name){
        console.log("change view")
        switch(view_name) {
          case 'rear_light':
            this.updateCameraPositon(CAMERA_POSITIONS.rear_light);
            break;
          case 'front_light':
            this.updateCameraPositon(CAMERA_POSITIONS.head_light);
            break;
          case 'sunroof':
            this.updateCameraPositon(CAMERA_POSITIONS.sunroof);
            break;
          case 'wheel_rings':
            this.updateCameraPositon(CAMERA_POSITIONS.wheel_rings);
            break;
          case 'free_view':
            this.updateCameraPositon(CAMERA_POSITIONS.free_view);
            break;
          default:
        }
    }
}

window.application = new WebGL({
    canvas: document.querySelector("#canvas")
});
