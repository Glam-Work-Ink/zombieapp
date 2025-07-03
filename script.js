<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zombie Apocalypse 3D Simulator</title>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            background-color: #000;
            font-family: sans-serif;
            color: #fff;
        }

        #game-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
        }

        #loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .loading-content {
            text-align: center;
        }

        #menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1001;
        }

        .menu-content {
            text-align: center;
        }

        .menu-button {
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            background-color: #4CAF50;
            color: white;
            font-size: 16px;
            cursor: pointer;
            transition: opacity 0.3s;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .menu-button:hover {
            opacity: 0.8;
        }

        .hidden {
            display: none;
        }

        /* HUD */
        #hud {
            position: absolute;
            top: 20px;
            left: 20px;
            z-index: 10;
            color: #fff;
        }

        .status-panel {
            background-color: rgba(0, 0, 0, 0.5);
            padding: 10px;
            border-radius: 5px;
        }

        .health-bar, .stamina-bar, .rope-tension {
            margin-bottom: 5px;
        }

        .bar {
            width: 200px;
            height: 15px;
            background-color: #333;
            border-radius: 8px;
            overflow: hidden;
        }

        .fill {
            height: 100%;
            width: 100%;
            background: linear-gradient(90deg, #ff0000, #ff6666);
            border-radius: 8px;
            transition: width 0.3s ease;
        }

        .stamina-fill {
            background: linear-gradient(90deg, #00ff00, #66ff66);
        }

        .tension-meter {
            width: 200px;
            height: 15px;
            border: 2px solid #ffff00;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
        }

        .tension-fill {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 0;
            background: linear-gradient(90deg, #ffff00, #ff0000);
            border-radius: 6px;
            transition: width 0.3s ease;
        }
        .earthquake-timer {
            margin-top: 5px;
        }

        .timer-display {
            font-size: 18px;
            font-weight: bold;
        }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/stats.js/r17/Stats.min.js"></script>
</head>
<body>
    <canvas id="game-canvas"></canvas>

    <div id="loading-screen">
        <div class="loading-content">
            <h1>Cargando...</h1>
            <p>Simulador Apocalipsis Zombie 3D</p>
        </div>
    </div>

    <div id="menu-overlay" class="hidden">
        <div class="menu-content">
            <h1>Juego Pausado</h1>
            <button class="menu-button" onclick="resumeGame()">Reanudar</button>
            <button class="menu-button" onclick="restartGame()">Reiniciar</button>
            <button class="menu-button" onclick="toggleSettings()">Opciones</button>
        </div>
    </div>

    <div id="hud">
            <div class="status-panel">
                <div class="health-bar">
                    <span>Salud:</span>
                    <div class="bar">
                        <div class="fill health-fill"></div>
                    </div>
                </div>
                <div class="stamina-bar">
                    <span>Resistencia:</span>
                    <div class="bar">
                        <div class="fill stamina-fill"></div>
                    </div>
                </div>
                <div class="rope-tension">
                    <span>Tensión Cuerda:</span>
                    <div class="tension-meter">
                        <div class="tension-fill"></div>
                    </div>
                </div>
                <div class="earthquake-timer">
                    <span>Terremoto en:</span>
                    <div class="timer-display">
                        <span id="earthquake-countdown">--:--</span>
                    </div>
                </div>
            </div>
    </div>

    <script>
// Zombie Apocalypse 3D Simulator - "Estamos Muertos" (Simplified Physics)
class ZombieApocalypseGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('game-canvas'),
            antialias: true 
        });

        this.player = {
            position: new THREE.Vector3(0, 2, 20),
            velocity: new THREE.Vector3(0, 0, 0),
            health: 100,
            stamina: 100,
            speed: 5,
            isRunning: false,
            isJumping: false,
            onGround: true,
            flashlight: null,
            supplies: 0,
            generators: 0
        };

        this.controls = {
            moveForward: false,
            moveBackward: false,
            moveLeft: false,
            moveRight: false,
            canJump: false,
            isPointerLocked: false
        };

        this.zombies = [];
        this.rope = null;
        this.ropeTension = 0;
        this.generators = [];
        this.supplies = [];
        this.buildings = [];
        this.particles = null;
        this.ground = null;

        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.audioContext = null;
        this.sounds = {};

        this.gameState = 'loading';
        this.gravity = -50;

        // Sistema de terremoto
        this.earthquake = {
            isActive: false,
            startTime: 10, // Empieza a los 10 segundos
            duration: 45, // 45 segundos de terremoto intenso
            intensity: 0,
            maxIntensity: 15, // Mucho más intenso
            shakeAmount: 0,
            lastShake: 0,
            collapsingBuildings: [],
            fallingDebris: [],
            groundCracks: [],
            hasStarted: false,
            music: null,
            meteorites: [],
            explosions: [],
            nextMeteoriteTime: 0,
            nextExplosionTime: 0,
            cameraShake: { x: 0, y: 0, z: 0 }
        };

        // Emergency alarm system - Más constante y fuerte
        this.alarmSystem = {
            isActive: false,
            lastAlarmTime: 0,
            alarmDuration: 45, // 45 seconds on (más largo)
            alarmInterval: 90, // 1.5 minutos entre alarmas (más frecuente)
            lights: [],
            sound: null,
            continuousAlarm: null
        };

        // Abandoned house
        this.abandonedHouse = null;
        this.houseDoor = null;
        this.isDoorOpen = false;
        this.bedInteraction = null;
        this.tableInteraction = null;

        this.init();
    }

    async init() {
        this.setupRenderer();
        this.setupLighting();
        this.createEnvironment();
        this.createPlayer();
        this.createZombies();
        this.createRope();
        this.createSupplies();
        this.createGenerators();
        this.setupControls();
        this.setupAudio();
        this.setupParticles();

        // Hide loading screen after 2 seconds
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
            this.gameState = 'playing';
            this.lockPointer();
        }, 2000);

        this.animate();
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x1a0000);
        this.renderer.fog = new THREE.FogExp2(0x330000, 0.01);
        this.scene.fog = this.renderer.fog;
    }

    setupLighting() {
        // Ambient light (muy tenue para atmosfera sombría)
        const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.3);
        this.scene.add(ambientLight);

        // Luna (luz direccional principal)
        const moonLight = new THREE.DirectionalLight(0x4444aa, 0.5);
        moonLight.position.set(50, 100, 50);
        moonLight.castShadow = true;
        moonLight.shadow.camera.left = -100;
        moonLight.shadow.camera.right = 100;
        moonLight.shadow.camera.top = 100;
        moonLight.shadow.camera.bottom = -100;
        moonLight.shadow.camera.near = 0.1;
        moonLight.shadow.camera.far = 200;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        this.scene.add(moonLight);

        // AURORA BOREAL
        this.createAuroraBoreal();

        // Luces de emergencia parpadeantes
        for(let i = 0; i < 5; i++) {
            const emergencyLight = new THREE.PointLight(0xff0000, 2, 20);
            emergencyLight.position.set(
                (Math.random() - 0.5) * 100,
                5 + Math.random() * 10,
                (Math.random() - 0.5) * 100
            );
            this.scene.add(emergencyLight);

            // Animación de parpadeo
            emergencyLight.userData = { 
                originalIntensity: emergencyLight.intensity,
                flickerSpeed: 0.1 + Math.random() * 0.2
            };
        }
    }

    createEnvironment() {
        // Suelo destruido expandido
        const groundGeometry = new THREE.PlaneGeometry(200, 200, 100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a1a1a,
            wireframe: false 
        });

        // Deformar el suelo para simular destrucción
        const vertices = groundGeometry.attributes.position.array;
        for(let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] += (Math.random() - 0.5) * 3; // Más variación en altura
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();

        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.ground.position.y = 0;
        this.scene.add(this.ground);

        // Calles destruidas
        this.createStreets();

        // Edificios destruidos expandidos
        this.createBuildings();

        // Carros destruidos
        this.createBrokenCars();

        // Bosque tenebroso
        this.createForest();

        // Humo en las calles
        this.createStreetSmoke();

        // Puente colgante
        this.createBridge();

        // Debris y objetos del entorno
        this.createDebris();

        // Sistema de alarma de emergencia
        this.createEmergencyAlarmSystem();

        // Casa abandonada
        this.createAbandonedHouse();
    }

    createAuroraBoreal() {
        // Crear múltiples capas de aurora boreal
        this.auroraLights = [];

        // Aurora principal - Verde
        const aurora1Geometry = new THREE.PlaneGeometry(300, 80);
        const aurora1Material = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const aurora1 = new THREE.Mesh(aurora1Geometry, aurora1Material);
        aurora1.position.set(0, 60, -150);
        aurora1.rotation.x = -0.3;
        aurora1.userData = { type: 'aurora', baseOpacity: 0.15, waveSpeed: 0.8 };
        this.scene.add(aurora1);
        this.auroraLights.push(aurora1);

        // Aurora secundaria - Azul-Verde
        const aurora2Geometry = new THREE.PlaneGeometry(250, 60);
        const aurora2Material = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const aurora2 = new THREE.Mesh(aurora2Geometry, aurora2Material);
        aurora2.position.set(-80, 55, -140);
        aurora2.rotation.x = -0.4;
        aurora2.rotation.y = 0.2;
        aurora2.userData = { type: 'aurora', baseOpacity: 0.12, waveSpeed: 1.2 };
        this.scene.add(aurora2);
        this.auroraLights.push(aurora2);

        // Aurora tercera - Violeta
        const aurora3Geometry = new THREE.PlaneGeometry(200, 50);
        const aurora3Material = new THREE.MeshBasicMaterial({
            color: 0x8800ff,
            transparent: true,
            opacity: 0.10,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const aurora3 = new THREE.Mesh(aurora3Geometry, aurora3Material);
        aurora3.position.set(100, 50, -130);
        aurora3.rotation.x = -0.5;
        aurora3.rotation.y = -0.3;
        aurora3.userData = { type: 'aurora', baseOpacity: 0.10, waveSpeed: 0.6 };
        this.scene.add(aurora3);
        this.auroraLights.push(aurora3);

        // Luz ambiental de aurora que cambia de color
        this.auroraAmbientLight = new THREE.AmbientLight(0x004422, 0.1);
        this.scene.add(this.auroraAmbientLight);
    }

    createBuildings() {
        const buildingPositions = [
            // Bloque central
            { x: -30, z: -30, height: 25 },
            { x: 30, z: -30, height: 20 },
            { x: -30, z: 30, height: 18 },
            { x: 30, z: 30, height: 22 },
            { x: 0, z: -45, height: 15 },
            { x: -45, z: 0, height: 16 },

            // Expansión del mapa - más edificios
            { x: -60, z: -60, height: 30 },
            { x: 60, z: -60, height: 28 },
            { x: -60, z: 60, height: 24 },
            { x: 60, z: 60, height: 26 },
            { x: 0, z: -80, height: 20 },
            { x: -80, z: 0, height: 22 },
            { x: 80, z: 0, height: 18 },
            { x: 0, z: 80, height: 19 },

            // Edificios medios
            { x: -15, z: -70, height: 12 },
            { x: 15, z: -70, height: 14 },
            { x: -70, z: -15, height: 16 },
            { x: -70, z: 15, height: 13 },
            { x: 70, z: -15, height: 15 },
            { x: 70, z: 15, height: 17 },
            { x: -15, z: 70, height: 11 },
            { x: 15, z: 70, height: 13 }
        ];

        buildingPositions.forEach(pos => {
            const building = this.createDamagedBuilding(pos.x, pos.z, pos.height);
            this.buildings.push(building);
            this.scene.add(building);
        });
    }

    createDamagedBuilding(x, z, height) {
        const group = new THREE.Group();

        // Estructura principal del edificio con daños
        const buildingGeometry = new THREE.BoxGeometry(8, height, 8);
        const vertices = buildingGeometry.attributes.position.array;

        // Deformar edificio para simular colapso parcial
        for(let i = 0; i < vertices.length; i += 3) {
            if(Math.random() > 0.7) {
                vertices[i] += (Math.random() - 0.5) * 2; // Deformación X
                vertices[i + 1] += (Math.random() - 0.5) * 3; // Deformación Y
                vertices[i + 2] += (Math.random() - 0.5) * 2; // Deformación Z
            }
        }
        buildingGeometry.attributes.position.needsUpdate = true;
        buildingGeometry.computeVertexNormals();

        const buildingMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(0, 0, 0.15 + Math.random() * 0.1),
            transparent: true,
            opacity: 0.9 
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(x, height/2, z);
        building.castShadow = true;
        building.receiveShadow = true;

        // Inclinar edificio aleatoriamente para simular colapso
        building.rotation.z = (Math.random() - 0.5) * 0.2;
        building.rotation.x = (Math.random() - 0.5) * 0.1;

        group.add(building);

        // Ventanas rotas con efectos de sangre
        for(let i = 0; i < 4; i++) {
            for(let j = 0; j < Math.floor(height/3); j++) {
                if(Math.random() > 0.2) {
                    const windowGeometry = new THREE.PlaneGeometry(0.8, 1.2);
                    const windowMaterial = new THREE.MeshBasicMaterial({ 
                        color: Math.random() > 0.7 ? 0x440000 : 0x000000, // Algunas ventanas con sangre
                        transparent: true,
                        opacity: 0.9 
                    });
                    const window = new THREE.Mesh(windowGeometry, windowMaterial);

                    const angle = (i * Math.PI) / 2;
                    window.position.set(
                        x + Math.cos(angle) * 4.1,
                        j * 3 + 2,
                        z + Math.sin(angle) * 4.1
                    );
                    window.rotation.y = angle;

                    // Agregar grietas aleatorias en ventanas
                    if(Math.random() > 0.6) {
                        const crackGeometry = new THREE.PlaneGeometry(0.1, 1.5);
                        const crackMaterial = new THREE.MeshBasicMaterial({ 
                            color: 0x222222,
                            transparent: true,
                            opacity: 0.8 
                        });
                        const crack = new THREE.Mesh(crackGeometry, crackMaterial);
                        crack.position.copy(window.position);
                        crack.rotation.copy(window.rotation);
                        crack.rotation.z = Math.random() * Math.PI;
                        group.add(crack);
                    }

                    group.add(window);
                }
            }
        }

        // Agregar escombros alrededor del edificio
        for(let i = 0; i < 8; i++) {
            const debrisGeometry = new THREE.BoxGeometry(
                0.5 + Math.random() * 1.5,
                0.3 + Math.random() * 1,
                0.5 + Math.random() * 1.5
            );
            const debrisMaterial = new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(0, 0, 0.1 + Math.random() * 0.2) 
            });
            const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);

            const angle = Math.random() * Math.PI * 2;
            const distance = 5 + Math.random() * 3;
            debris.position.set(
                x + Math.cos(angle) * distance,
                Math.random() * 1,
                z + Math.sin(angle) * distance
            );
            debris.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            debris.castShadow = true;
            group.add(debris);
        }

        // Luces parpadeantes en edificios (cables colgando)
        if(Math.random() > 0.5) {
            const sparkLight = new THREE.PointLight(0x4444ff, 0.5, 10);
            sparkLight.position.set(
                x + (Math.random() - 0.5) * 6,
                height * 0.7 + Math.random() * 5,
                z + (Math.random() - 0.5) * 6
            );

            // Animación de chispas
            sparkLight.userData = { 
                originalIntensity: sparkLight.intensity,
                sparkSpeed: 0.05 + Math.random() * 0.1,
                type: 'spark'
            };

            this.scene.add(sparkLight);
        }

        return group;
    }

    createBridge() {
        // Plataformas del puente
        const platformGeometry = new THREE.BoxGeometry(6, 0.5, 3);
        const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

        const platform1 = new THREE.Mesh(platformGeometry, platformMaterial);
        platform1.position.set(-15, 15, 0);
        platform1.castShadow = true;
        this.scene.add(platform1);

        const platform2 = new THREE.Mesh(platformGeometry, platformMaterial);
        platform2.position.set(15, 15, 0);
        platform2.castShadow = true;
        this.scene.add(platform2);
    }

    createRope() {
        const ropeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 30);
        const ropeMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        this.rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
        this.rope.position.set(0, 15, 0);
        this.rope.rotation.z = Math.PI / 2;
        this.rope.userData = { originalY: 15 };
        this.scene.add(this.rope);
    }

    createStreets() {
        // Calles principales con asfalto agrietado
        const streetPositions = [
            // Calles horizontales
            { x: 0, z: -50, width: 120, height: 8, rotation: 0 },
            { x: 0, z: 0, width: 120, height: 8, rotation: 0 },
            { x: 0, z: 50, width: 120, height: 8, rotation: 0 },

            // Calles verticales
            { x: -50, z: 0, width: 120, height: 8, rotation: Math.PI/2 },
            { x: 0, z: 0, width: 120, height: 8, rotation: Math.PI/2 },
            { x: 50, z: 0, width: 120, height: 8, rotation: Math.PI/2 }
        ];

        streetPositions.forEach(street => {
            const streetGeometry = new THREE.PlaneGeometry(street.width, street.height, 20, 5);
            const streetMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x111111,
                transparent: true,
                opacity: 0.8
            });

            // Agrietar el asfalto
            const vertices = streetGeometry.attributes.position.array;
            for(let i = 0; i < vertices.length; i += 3) {
                if(Math.random() > 0.7) {
                    vertices[i + 2] += (Math.random() - 0.5) * 0.3;
                }
            }
            streetGeometry.attributes.position.needsUpdate = true;
            streetGeometry.computeVertexNormals();

            const streetMesh = new THREE.Mesh(streetGeometry, streetMaterial);
            streetMesh.rotation.x = -Math.PI / 2;
            streetMesh.rotation.z = street.rotation;
            streetMesh.position.set(street.x, 0.1, street.z);
            streetMesh.receiveShadow = true;
            this.scene.add(streetMesh);

            // Líneas amarillas desvanecidas en las calles
            const lineGeometry = new THREE.PlaneGeometry(street.width * 0.8, 0.3);
            const lineMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x444400,
                transparent: true,
                opacity: 0.3
            });
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.rotation.x = -Math.PI / 2;
            line.rotation.z = street.rotation;
            line.position.set(street.x, 0.11, street.z);
            this.scene.add(line);
        });
    }

    createBrokenCars() {
        const carPositions = [
            { x: -25, z: -50, rotation: 0.2 },
            { x: 10, z: -48, rotation: -0.5 },
            { x: 35, z: 52, rotation: 1.2 },
            { x: -40, z: 3, rotation: 0.8 },
            { x: 15, z: 25, rotation: -0.3 },
            { x: -60, z: 45, rotation: 1.5 },
            { x: 70, z: -20, rotation: 0.1 },
            { x: -10, z: 75, rotation: -1.2 },
            { x: 45, z: -75, rotation: 0.7 }
        ];

        carPositions.forEach(carPos => {
            const carGroup = new THREE.Group();

            // Cuerpo del carro
            const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 2);
            const bodyMaterial = new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(Math.random() * 0.1, 0.3, 0.1 + Math.random() * 0.2)
            });
            const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
            carBody.position.y = 1;
            carBody.castShadow = true;
            carGroup.add(carBody);

            // Techo parcialmente colapsado
            const roofGeometry = new THREE.BoxGeometry(3.8, 0.8, 1.8);
            const roofMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x222222 
            });
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.y = 2;
            roof.rotation.x = (Math.random() - 0.5) * 0.5;
            roof.rotation.z = (Math.random() - 0.5) * 0.3;
            carGroup.add(roof);

            // Ventanas rotas
            const frontWindowGeometry = new THREE.PlaneGeometry(3.5, 1.2);
            const windowMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x001100,
                transparent: true,
                opacity: 0.7 
            });
            const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
            frontWindow.position.set(0, 1.8, 1.1);
            frontWindow.rotation.x = -0.1;
            carGroup.add(frontWindow);

            // Ruedas desinfladas/rotas
            for(let i = 0; i < 4; i++) {
                const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3);
                const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });
                const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);

                const x = i < 2 ? -1.5 : 1.5;
                const z = i % 2 === 0 ? -0.8 : 0.8;
                wheel.position.set(x, 0.3, z);
                wheel.rotation.z = Math.PI / 2;

                // Algunas ruedas desinfladas
                if(Math.random() > 0.6) {
                    wheel.scale.y = 0.5;
                    wheel.position.y = 0.15;
                }

                carGroup.add(wheel);
            }

            // Humo saliendo del motor
            if(Math.random() > 0.7) {
                this.createCarSmoke(carPos.x, carPos.z + 1.5);
            }

            carGroup.position.set(carPos.x, 0, carPos.z);
            carGroup.rotation.y = carPos.rotation;

            // Inclinar carro como si estuviera dañado
            carGroup.rotation.z = (Math.random() - 0.5) * 0.2;

            this.scene.add(carGroup);
        });
    }

    createForest() {
        // Bosque tenebroso en los bordes del mapa
        const forestPositions = [];

        // Bosque en los bordes
        for(let i = 0; i < 80; i++) {
            let x, z;
            const side = Math.floor(Math.random() * 4);

            switch(side) {
                case 0: // Lado izquierdo
                    x = -90 - Math.random() * 20;
```
                    z = (Math.random() - 0.5) * 180;
                    break;
                case 1: // Lado derecho
                    x = 90 + Math.random() * 20;
                    z = (Math.random() - 0.5) * 180;
                    break;
                case 2: // Lado superior
                    x = (Math.random() - 0.5) * 180;
                    z = -90 - Math.random() * 20;
                    break;
                case 3: // Lado inferior
                    x = (Math.random() - 0.5) * 180;
                    z = 90 + Math.random() * 20;
                    break;
            }

            forestPositions.push({ x, z });
        }

        forestPositions.forEach(pos => {
            const treeGroup = new THREE.Group();

            // Tronco del árbol
            const trunkHeight = 8 + Math.random() * 6;
            const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, trunkHeight);
            const trunkMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x2d1810 
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = trunkHeight / 2;
            trunk.castShadow = true;
            treeGroup.add(trunk);

            // Copa del árbol (siniestra)
            const foliageGeometry = new THREE.SphereGeometry(2 + Math.random() * 2, 8, 6);
            const foliageMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x0f2d0f,
                transparent: true,
                opacity: 0.8 
            });
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = trunkHeight + 1;
            foliage.scale.y = 0.7 + Math.random() * 0.6; // Árboles deformados

            // Deformar la copa para hacerla más siniestra
            const foliageVertices = foliageGeometry.attributes.position.array;
            for(let i = 0; i < foliageVertices.length; i += 3) {
                if(Math.random() > 0.7) {
                    foliageVertices[i] += (Math.random() - 0.5) * 1;
                    foliageVertices[i + 1] += (Math.random() - 0.5) * 1;
                    foliageVertices[i + 2] += (Math.random() - 0.5) * 1;
                }
            }
            foliageGeometry.attributes.position.needsUpdate = true;
            foliageGeometry.computeVertexNormals();

            treeGroup.add(foliage);

            // Ramas colgantes ocasionales
            if(Math.random() > 0.6) {
                for(let i = 0; i < 3; i++) {
                    const branchGeometry = new THREE.CylinderGeometry(0.05, 0.1, 2);
                    const branchMaterial = new THREE.MeshLambertMaterial({ color: 0x1a0d08 });
                    const branch = new THREE.Mesh(branchGeometry, branchMaterial);

                    branch.position.set(
                        (Math.random() - 0.5) * 3,
                        trunkHeight - Math.random() * 2,
                        (Math.random() - 0.5) * 3
                    );
                    branch.rotation.z = (Math.random() - 0.5) * 0.8;
                    treeGroup.add(branch);
                }
            }

            treeGroup.position.set(pos.x, 0, pos.z);
            treeGroup.rotation.y = Math.random() * Math.PI * 2;

            // Inclinar árboles aleatoriamente
            treeGroup.rotation.z = (Math.random() - 0.5) * 0.3;

            this.scene.add(treeGroup);
        });
    }

    createStreetSmoke() {
        // Sistemas de partículas para humo en las calles
        const smokePositions = [
            { x: -20, z: -40 },
            { x: 30, z: -30 },
            { x: -40, z: 20 },
            { x: 50, z: 40 },
            { x: 0, z: -70 },
            { x: -60, z: 0 },
            { x: 70, z: -50 }
        ];

        smokePositions.forEach(pos => {
            this.createSmokeEffect(pos.x, pos.z);
        });
    }

    createSmokeEffect(x, z) {
        // Sistema de humo 3D más realista con múltiples capas
        const smokeGroup = new THREE.Group();

        // Capa principal de humo denso
        const mainSmokeCount = 300;
        const mainSmokeGeometry = new THREE.BufferGeometry();
        const mainPositions = new Float32Array(mainSmokeCount * 3);
        const mainVelocities = new Float32Array(mainSmokeCount * 3);
        const mainSizes = new Float32Array(mainSmokeCount);
        const mainOpacities = new Float32Array(mainSmokeCount);
        const mainAges = new Float32Array(mainSmokeCount);

        for(let i = 0; i < mainSmokeCount; i++) {
            const i3 = i * 3;
            mainPositions[i3] = x + (Math.random() - 0.5) * 6;
            mainPositions[i3 + 1] = Math.random() * 3;
            mainPositions[i3 + 2] = z + (Math.random() - 0.5) * 6;

            mainVelocities[i3] = (Math.random() - 0.5) * 0.8;
            mainVelocities[i3 + 1] = 1.5 + Math.random() * 3;
            mainVelocities[i3 + 2] = (Math.random() - 0.5) * 0.8;

            mainSizes[i] = 2 + Math.random() * 4;
            mainOpacities[i] = 0.3 + Math.random() * 0.5;
            mainAges[i] = Math.random() * 15;
        }

        mainSmokeGeometry.setAttribute('position', new THREE.BufferAttribute(mainPositions, 3));
        mainSmokeGeometry.setAttribute('velocity', new THREE.BufferAttribute(mainVelocities, 3));
        mainSmokeGeometry.setAttribute('size', new THREE.BufferAttribute(mainSizes, 1));
        mainSmokeGeometry.setAttribute('opacity', new THREE.BufferAttribute(mainOpacities, 1));
        mainSmokeGeometry.setAttribute('age', new THREE.BufferAttribute(mainAges, 1));

        const mainSmokeMaterial = new THREE.PointsMaterial({
            color: 0x2a2a2a,
            size: 3,
            transparent: true,
            opacity: 0.6,
            blending: THREE.NormalBlending,
            depthWrite: false
        });

        const mainSmoke = new THREE.Points(mainSmokeGeometry, mainSmokeMaterial);
        mainSmoke.userData = { type: 'mainSmoke', layer: 'dense' };
        smokeGroup.add(mainSmoke);

        // Capa de humo ligero (más alto)
        const lightSmokeCount = 150;
        const lightSmokeGeometry = new THREE.BufferGeometry();
        const lightPositions = new Float32Array(lightSmokeCount * 3);
        const lightVelocities = new Float32Array(lightSmokeCount * 3);
        const lightSizes = new Float32Array(lightSmokeCount);

        for(let i = 0; i < lightSmokeCount; i++) {
            const i3 = i * 3;
            lightPositions[i3] = x + (Math.random() - 0.5) * 8;
            lightPositions[i3 + 1] = 5 + Math.random() * 10;
            lightPositions[i3 + 2] = z + (Math.random() - 0.5) * 8;

            lightVelocities[i3] = (Math.random() - 0.5) * 1.2;
            lightVelocities[i3 + 1] = 0.8 + Math.random() * 1.5;
            lightVelocities[i3 + 2] = (Math.random() - 0.5) * 1.2;

            lightSizes[i] = 4 + Math.random() * 6;
        }

        lightSmokeGeometry.setAttribute('position', new THREE.BufferAttribute(lightPositions, 3));
        lightSmokeGeometry.setAttribute('velocity', new THREE.BufferAttribute(lightVelocities, 3));
        lightSmokeGeometry.setAttribute('size', new THREE.BufferAttribute(lightSizes, 1));

        const lightSmokeMaterial = new THREE.PointsMaterial({
            color: 0x555555,
            size: 5,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const lightSmoke = new THREE.Points(lightSmokeGeometry, lightSmokeMaterial);
        lightSmoke.userData = { type: 'lightSmoke', layer: 'light' };
        smokeGroup.add(lightSmoke);

        // Chispas y brasas
        const sparksCount = 50;
        const sparksGeometry = new THREE.BufferGeometry();
        const sparksPositions = new Float32Array(sparksCount * 3);
        const sparksVelocities = new Float32Array(sparksCount * 3);

        for(let i = 0; i < sparksCount; i++) {
            const i3 = i * 3;
            sparksPositions[i3] = x + (Math.random() - 0.5) * 2;
            sparksPositions[i3 + 1] = Math.random() * 2;
            sparksPositions[i3 + 2] = z + (Math.random() - 0.5) * 2;

            sparksVelocities[i3] = (Math.random() - 0.5) * 2;
            sparksVelocities[i3 + 1] = 2 + Math.random() * 4;
            sparksVelocities[i3 + 2] = (Math.random() - 0.5) * 2;
        }

        sparksGeometry.setAttribute('position', new THREE.BufferAttribute(sparksPositions, 3));
        sparksGeometry.setAttribute('velocity', new THREE.BufferAttribute(sparksVelocities, 3));

        const sparksMaterial = new THREE.PointsMaterial({
            color: 0xff4400,
            size: 1,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const sparks = new THREE.Points(sparksGeometry, sparksMaterial);
        sparks.userData = { type: 'sparks' };
        smokeGroup.add(sparks);

        smokeGroup.userData = { type: 'smokeGroup', baseX: x, baseZ: z };
        this.scene.add(smokeGroup);
    }

    createCarSmoke(x, z) {
        const particleCount = 50;
        const smokeGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        for(let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = x + (Math.random() - 0.5) * 2;
            positions[i3 + 1] = 1 + Math.random();
            positions[i3 + 2] = z + (Math.random() - 0.5) * 2;

            velocities[i3] = (Math.random() - 0.5) * 0.2;
            velocities[i3 + 1] = 0.5 + Math.random();
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
        }

        smokeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        smokeGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        const smokeMaterial = new THREE.PointsMaterial({
            color: 0x222222,
            size: 1.5,
            transparent: true,
            opacity: 0.6
        });

        const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
        smoke.userData = { type: 'carSmoke' };
        this.scene.add(smoke);
    }

    createDebris() {
        // Escombros alrededor del área expandida
        for(let i = 0; i < 120; i++) {
            const debrisGeometry = new THREE.BoxGeometry(
                0.5 + Math.random() * 2,
                0.5 + Math.random() * 2,
                0.5 + Math.random() * 2
            );
            const debrisMaterial = new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(0, 0, 0.1 + Math.random() * 0.2) 
            });
            const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);

            debris.position.set(
                (Math.random() - 0.5) * 160,
                Math.random() * 2,
                (Math.random() - 0.5) * 160
            );
            debris.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            debris.castShadow = true;
            this.scene.add(debris);
        }
    }

    createEmergencyAlarmSystem() {
        // Torres de alarma distribuidas por la ciudad
        const alarmPositions = [
            { x: -40, z: -40 },
            { x: 40, z: -40 },
            { x: -40, z: 40 },
            { x: 40, z: 40 },
            { x: 0, z: 0 },
            { x: -70, z: 0 },
            { x: 70, z: 0 },
            { x: 0, z: -70 },
            { x: 0, z: 70 }
        ];

        alarmPositions.forEach(pos => {
            const alarmGroup = new THREE.Group();

            // Torre de la sirena
            const towerGeometry = new THREE.CylinderGeometry(0.8, 1.2, 15);
            const towerMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x333333 
            });
            const tower = new THREE.Mesh(towerGeometry, towerMaterial);
            tower.position.y = 7.5;
            tower.castShadow = true;
            alarmGroup.add(tower);

            // Altavoz/sirena en la parte superior
            const speakerGeometry = new THREE.ConeGeometry(1.5, 2, 8);
            const speakerMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x666666 
            });
            const speaker = new THREE.Mesh(speakerGeometry, speakerMaterial);
            speaker.position.y = 16;
            speaker.castShadow = true;
            alarmGroup.add(speaker);

            // Luces de emergencia rojas giratorias
            const lightGeometry = new THREE.SphereGeometry(0.5);
            const lightMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                transparent: true,
                opacity: 0.8
            });
            const emergencyLight = new THREE.Mesh(lightGeometry, lightMaterial);
            emergencyLight.position.y = 14;
            emergencyLight.userData = { 
                type: 'alarmLight',
                rotationSpeed: 2,
                originalIntensity: 2
            };
            alarmGroup.add(emergencyLight);

            // Luz point para iluminar el área
            const pointLight = new THREE.PointLight(0xff0000, 0, 50);
            pointLight.position.y = 14;
            pointLight.userData = { 
                type: 'alarmPointLight',
                originalIntensity: 5
            };
            alarmGroup.add(pointLight);

            this.alarmSystem.lights.push(pointLight);

            alarmGroup.position.set(pos.x, 0, pos.z);
            this.scene.add(alarmGroup);
        });
    }

    createAbandonedHouse() {
        const houseGroup = new THREE.Group();

        // Posición de la casa (cerca del jugador pero no demasiado)
        const houseX = -25;
        const houseZ = 25;

        // Estructura principal de la casa
        const houseGeometry = new THREE.BoxGeometry(12, 8, 10);
        const houseMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x3a2a1a,
            transparent: true,
            opacity: 0.9 
        });
        const house = new THREE.Mesh(houseGeometry, houseMaterial);
        house.position.set(0, 4, 0);
        house.castShadow = true;
        house.receiveShadow = true;
        houseGroup.add(house);

        // Techo inclinado y dañado
        const roofGeometry = new THREE.ConeGeometry(8, 4, 4);
        const roofMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2a1a0a 
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 10;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        houseGroup.add(roof);

        // Ventanas rotas
        const windowPositions = [
            { x: -6.1, y: 4, z: 2, rotY: -Math.PI/2 },
            { x: -6.1, y: 4, z: -2, rotY: -Math.PI/2 },
            { x: 6.1, y: 4, z: 2, rotY: Math.PI/2 },
            { x: 0, y: 4, z: -5.1, rotY: 0 }
        ];

        windowPositions.forEach(winPos => {
            const windowGeometry = new THREE.PlaneGeometry(2, 1.5);
            const windowMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x111111,
                transparent: true,
                opacity: 0.7 
            });
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.set(winPos.x, winPos.y, winPos.z);
            window.rotation.y = winPos.rotY;
            houseGroup.add(window);

            // Marco de ventana roto
            const frameGeometry = new THREE.PlaneGeometry(2.2, 1.7);
            const frameMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x4a3a2a,
                transparent: true,
                opacity: 0.8 
            });
            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
            frame.position.copy(window.position);
            frame.rotation.copy(window.rotation);
            frame.position.add(new THREE.Vector3(0, 0, -0.01));
            houseGroup.add(frame);
        });

        // PUERTA INTERACTIVA
        const doorGeometry = new THREE.BoxGeometry(1.5, 3, 0.2);
        const doorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4a2a1a 
        });
        this.houseDoor = new THREE.Mesh(doorGeometry, doorMaterial);
        this.houseDoor.position.set(3, 1.5, 5.1);
        this.houseDoor.userData = { 
            type: 'door',
            isOpen: false,
            originalPosition: new THREE.Vector3(3, 1.5, 5.1),
            openPosition: new THREE.Vector3(1.5, 1.5, 5.1)
        };
        this.houseDoor.castShadow = true;
        houseGroup.add(this.houseDoor);

        // Marco de la puerta
        const doorFrameGeometry = new THREE.BoxGeometry(2, 3.5, 0.3);
        const doorFrameMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2a1a0a 
        });
        const doorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
        doorFrame.position.set(3, 1.75, 5.15);
        houseGroup.add(doorFrame);

        // Manija de la puerta
        const handleGeometry = new THREE.SphereGeometry(0.1);
        const handleMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x666666 
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(2.3, 1.5, 5.2);
        houseGroup.add(handle);

        houseGroup.position.set(houseX, 0, houseZ);
        this.abandonedHouse = houseGroup;
        this.scene.add(houseGroup);

        // INTERIOR DE LA CASA
        this.createHouseInterior(houseX, houseZ);
    }

    createHouseInterior(houseX, houseZ) {
        const interiorGroup = new THREE.Group();

        // Suelo interior
        const floorGeometry = new THREE.PlaneGeometry(11, 9);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2a1a0a 
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.1;
        floor.receiveShadow = true;
        interiorGroup.add(floor);

        // CAMA
        const bedGroup = new THREE.Group();

        // Marco de la cama
        const bedFrameGeometry = new THREE.BoxGeometry(4, 0.5, 2);
        const bedFrameMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4a2a1a 
        });
        const bedFrame = new THREE.Mesh(bedFrameGeometry, bedFrameMaterial);
        bedFrame.position.set(-3, 0.5, -2);
        bedFrame.castShadow = true;
        bedGroup.add(bedFrame);

        // Colchón
        const mattressGeometry = new THREE.BoxGeometry(3.8, 0.3, 1.8);
        const mattressMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a3a1a,
            transparent: true,
            opacity: 0.8 
        });
        const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
        mattress.position.set(-3, 0.9, -2);
        mattress.userData = { 
            type: 'bed',
            canSleep: true 
        };
        this.bedInteraction = mattress;
        bedGroup.add(mattress);

        // Almohada
        const pillowGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.6);
        const pillowMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2a2a2a,
            transparent: true,
            opacity: 0.7 
        });
        const pillow = new THREE.Mesh(pillowGeometry, pillowMaterial);
        pillow.position.set(-4, 1.1, -2);
        bedGroup.add(pillow);

        interiorGroup.add(bedGroup);

        // MESA FEA Y VIEJA
        const tableGroup = new THREE.Group();

        // Superficie de la mesa
        const tableTopGeometry = new THREE.BoxGeometry(2.5, 0.1, 1.5);
        const tableTopMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x3a2a1a 
        });
        const tableTop = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
        tableTop.position.set(2, 1.5, 1);
        tableTop.castShadow = true;
        tableGroup.add(tableTop);

        // Patas de la mesa (algunas rotas)
        const legPositions = [
            { x: 1, z: 0.5 }, // Pata 1
            { x: 3, z: 0.5 }, // Pata 2
            { x: 1, z: 1.5 }, // Pata 3 (rota)
            { x: 3, z: 1.5 }  // Pata 4
        ];

        legPositions.forEach((legPos, index) => {
            const legHeight = index === 2 ? 0.8 : 1.4; // Pata 3 rota
            const legGeometry = new THREE.BoxGeometry(0.1, legHeight, 0.1);
            const legMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x2a1a0a 
            });
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(legPos.x, legHeight/2, legPos.z);

            // Inclinar la mesa por la pata rota
            if(index === 2) {
                tableTop.rotation.z = -0.05;
                tableTop.position.y = 1.45;
            }

            tableGroup.add(leg);
        });

        // Objetos en la mesa
        const objectsGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.2);
        const objectsMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a1a1a 
        });
        const objects = new THREE.Mesh(objectsGeometry, objectsMaterial);
        objects.position.set(2.5, 1.7, 1.2);
        objects.userData = { 
            type: 'table',
            hasItems: true 
        };
        this.tableInteraction = objects;
        tableGroup.add(objects);

        interiorGroup.add(tableGroup);

        // Luz tenue interior
        const interiorLight = new THREE.PointLight(0x443322, 0.5, 8);
        interiorLight.position.set(0, 3, 0);
        interiorGroup.add(interiorLight);

        interiorGroup.position.set(houseX, 0, houseZ);
        this.scene.add(interiorGroup);
    }

    createPlayer() {
        // Camera setup
        this.camera.position.copy(this.player.position);
        this.camera.position.y += 1.6; // Eye level

        // Flashlight
        this.player.flashlight = new THREE.SpotLight(0xffffff, 2, 30, Math.PI / 6, 0.5);
        this.player.flashlight.position.copy(this.camera.position);
        this.player.flashlight.target.position.set(0, 0, -1);
        this.player.flashlight.castShadow = true;
        this.scene.add(this.player.flashlight);
        this.scene.add(this.player.flashlight.target);
    }

    createZombies() {
        const zombieCount = 15;

        for(let i = 0; i < zombieCount; i++) {
            const zombie = this.createZombie();
            this.zombies.push(zombie);
            this.scene.add(zombie.mesh);
        }
    }

    createZombie() {
        const zombieGeometry = new THREE.BoxGeometry(1, 2, 0.5);
        const zombieMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(0.08, 0.3, 0.2 + Math.random() * 0.2) 
        });
        const zombieMesh = new THREE.Mesh(zombieGeometry, zombieMaterial);

        // Random position around the area
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 30;
        zombieMesh.position.set(
            Math.cos(angle) * distance,
            1,
            Math.sin(angle) * distance
        );
        zombieMesh.castShadow = true;

        return {
            mesh: zombieMesh,
            position: zombieMesh.position.clone(),
            velocity: new THREE.Vector3(0, 0, 0),
            health: 100,
            speed: 2 + Math.random() * 2,
            target: null,
            isClimbing: false,
            lastSound: 0,
            hearingRange: 15,
            sightRange: 10
        };
    }

    createSupplies() {
        const supplyPositions = [
            { x: -20, z: -10 },
            { x: 10, z: -25 },
            { x: -5, z: 15 },
            { x: 25, z: 8 },
            { x: -30, z: 20 }
        ];

        supplyPositions.forEach(pos => {
            const supplyGeometry = new THREE.BoxGeometry(1, 1, 1);
            const supplyMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
            const supply = new THREE.Mesh(supplyGeometry, supplyMaterial);
            supply.position.set(pos.x, 1, pos.z);
            supply.userData = { type: 'supply', collected: false };

            // Glow effect
            const glowGeometry = new THREE.SphereGeometry(1.5);
            const glowMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                transparent: true, 
                opacity: 0.3 
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(supply.position);

            this.scene.add(supply);
            this.scene.add(glow);
            this.supplies.push({ mesh: supply, glow: glow });
        });
    }

    createGenerators() {
        const generatorPositions = [
            { x: -10, z: -30 },
            { x: 20, z: 10 },
            { x: -25, z: 5 }
        ];

        generatorPositions.forEach(pos => {
            const generatorGeometry = new THREE.BoxGeometry(2, 3, 2);
            const generatorMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
            const generator = new THREE.Mesh(generatorGeometry, generatorMaterial);
            generator.position.set(pos.x, 1.5, pos.z);
            generator.userData = { 
                type: 'generator', 
                activated: false,
                cooldown: 0 
            };

            this.scene.add(generator);
            this.generators.push(generator);
        });
    }

    setupParticles() {
        // Particle system for ash and atmosphere
        const particleCount = 1000;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        for(let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 200;
            positions[i + 1] = Math.random() * 50;
            positions[i + 2] = (Math.random() - 0.5) * 200;

            velocities[i] = (Math.random() - 0.5) * 0.5;
            velocities[i + 1] = -Math.random() * 0.5;
            velocities[i + 2] = (Math.random() - 0.5) * 0.5;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0x888888,
            size: 0.5,
            transparent: true,
            opacity: 0.6
        });

        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particles);
    }

    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            if(this.gameState !== 'playing') return;

            switch(event.code) {
                case 'KeyW': this.controls.moveForward = true; break;
                case 'KeyS': this.controls.moveBackward = true; break;
                case 'KeyA': this.controls.moveLeft = true; break;
                case 'KeyD': this.controls.moveRight = true; break;
                case 'Space': 
```javascript
                    if(this.player.onGround) this.jump();
                    event.preventDefault();
                    break;
                case 'KeyR': this.player.isRunning = true; break;
                case 'KeyF': this.toggleFlashlight(); break;
                case 'KeyE': this.interact(); break;
                case 'Escape': this.togglePause(); break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch(event.code) {
                case 'KeyW': this.controls.moveForward = false; break;
                case 'KeyS': this.controls.moveBackward = false; break;
                case 'KeyA': this.controls.moveLeft = false; break;
                case 'KeyD': this.controls.moveRight = false; break;
                case 'KeyR': this.player.isRunning = false; break;
            }
        });

        // Mouse controls - Arreglado para 360 grados
        this.mouseX = 0;
        this.mouseY = 0;

        document.addEventListener('mousemove', (event) => {
            if(!this.controls.isPointerLocked) return;

            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            // Controles de rotación más suaves y sin bloqueo
            this.mouseX -= movementX * 0.002;
            this.mouseY -= movementY * 0.002;

            // Limitar solo la rotación vertical para evitar dar vueltas completas verticalmente
            this.mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouseY));

            // Aplicar rotaciones
            this.camera.rotation.y = this.mouseX;
            this.camera.rotation.x = this.mouseY;
            this.camera.rotation.z = 0; // Evitar inclinación extraña
        });

        // Pointer lock
        document.addEventListener('click', () => {
            if(this.gameState === 'playing') {
                this.lockPointer();
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createAmbientSound();
        } catch(e) {
            console.log("Audio not supported");
        }
    }

    createAmbientSound() {
        if(!this.audioContext) return;

        // Wind sound using white noise
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for(let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.05;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start();
    }

    lockPointer() {
        const canvas = this.renderer.domElement;
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;

        if(canvas.requestPointerLock) {
            canvas.requestPointerLock();
            this.controls.isPointerLocked = true;
        }
    }

    jump() {
        if(this.player.onGround) {
            this.player.velocity.y = 15;
            this.player.onGround = false;
        }
    }

    toggleFlashlight() {
        this.player.flashlight.visible = !this.player.flashlight.visible;
    }

    interact() {
        // Raycast to find interactable objects
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        for(let intersect of intersects) {
            const object = intersect.object;
            if(object.userData.type === 'supply' && !object.userData.collected) {
                this.collectSupply(object);
                break;
            } else if(object.userData.type === 'generator' && !object.userData.activated) {
                this.activateGenerator(object);
                break;
            } else if(object.userData.type === 'door') {
                this.toggleDoor(object);
                break;
            } else if(object.userData.type === 'bed') {
                this.sleepInBed();
                break;
            } else if(object.userData.type === 'table') {
                this.searchTable();
                break;
            }
        }
    }

    toggleDoor(door) {
        this.playSound('door');

        if(door.userData.isOpen) {
            // Cerrar puerta
            door.position.copy(door.userData.originalPosition);
            door.userData.isOpen = false;
            this.isDoorOpen = false;
        } else {
            // Abrir puerta
            door.position.copy(door.userData.openPosition);
            door.userData.isOpen = true;
            this.isDoorOpen = true;
        }
    }

    sleepInBed() {
        this.playSound('sleep');

        // Efecto de descanso
        this.player.health = Math.min(100, this.player.health + 20);
        this.player.stamina = 100;

        // Efecto visual de descanso
        document.body.style.filter = 'brightness(0)';
        setTimeout(() => {
            document.body.style.filter = 'brightness(1)';
        }, 2000);

        // Mensaje
        this.showMessage("Has descansado. Salud y resistencia restauradas.");
    }

    searchTable() {
        this.playSound('search');

        if(this.tableInteraction.userData.hasItems) {
            this.player.supplies += Math.floor(Math.random() * 3) + 1;
            document.getElementById('supplies-count').textContent = this.player.supplies;
            this.tableInteraction.userData.hasItems = false;
            this.showMessage("Encontraste algunos suministros en la mesa.");
        } else {
            this.showMessage("La mesa está vacía.");
        }
    }

    showMessage(text) {
        // Crear mensaje temporal
        const messageDiv = document.createElement('div');
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.background = 'rgba(0,0,0,0.8)';
        messageDiv.style.color = '#fff';
        messageDiv.style.padding = '10px 20px';
        messageDiv.style.borderRadius = '5px';
        messageDiv.style.zIndex = '1000';
        messageDiv.textContent = text;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 3000);
    }

    playSound(type) {
        if(!this.audioContext) return;

        switch(type) {
            case 'door':
                this.createSimpleSound(150, 100, 0.3, 0.5);
                break;
            case 'sleep':
                this.createSimpleSound(200, 150, 0.2, 1);
                break;
            case 'search':
                this.createSimpleSound(300, 250, 0.2, 0.4);
                break;
            case 'alarm':
                this.createApocalypseSiren();
                break;
        }
    }

    createSimpleSound(startFreq, endFreq, volume, duration) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(endFreq, this.audioContext.currentTime + duration * 0.6);
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    createEarthquakeMusic() {
        // Crear música dramática de terremoto usando osciladores
        if(!this.audioContext) return;

        const duration = 60; // 60 segundos de música
        const currentTime = this.audioContext.currentTime;

        // Bajo dramático
        const bassOsc = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        bassOsc.type = 'square';
        bassOsc.frequency.setValueAtTime(55, currentTime); // La grave
        bassGain.gain.setValueAtTime(0, currentTime);
        bassGain.gain.linearRampToValueAtTime(0.3, currentTime + 2);
        bassGain.gain.setValueAtTime(0.3, currentTime + duration - 5);
        bassGain.gain.linearRampToValueAtTime(0, currentTime + duration);

        // Melodía dramática
        const melodyOsc = this.audioContext.createOscillator();
        const melodyGain = this.audioContext.createGain();
        melodyOsc.type = 'sawtooth';
        melodyOsc.frequency.setValueAtTime(220, currentTime);
        melodyGain.gain.setValueAtTime(0, currentTime);
        melodyGain.gain.linearRampToValueAtTime(0.2, currentTime + 3);

        // Secuencia melódica dramática
        const melody = [220, 196, 175, 165, 147, 131, 123, 110];
        melody.forEach((freq, index) => {
            melodyOsc.frequency.setValueAtTime(freq, currentTime + 3 + index * 7);
        });

        // Percusión/ritmo
        const rhythmOsc = this.audioContext.createOscillator();
        const rhythmGain = this.audioContext.createGain();
        rhythmOsc.type = 'triangle';
        rhythmOsc.frequency.setValueAtTime(80, currentTime);
        rhythmGain.gain.setValueAtTime(0, currentTime);
        rhythmGain.gain.linearRampToValueAtTime(0.4, currentTime + 1);

        // Filtros para efectos dramáticos
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, currentTime);
        filter.Q.setValueAtTime(0.5, currentTime);

        // Conectar todo
        bassOsc.connect(bassGain);
        melodyOsc.connect(melodyGain);
        rhythmOsc.connect(rhythmGain);

        bassGain.connect(filter);
        melodyGain.connect(filter);
        rhythmGain.connect(filter);
        filter.connect(this.audioContext.destination);

        // Iniciar osciladores
        bassOsc.start(currentTime);
        melodyOsc.start(currentTime);
        rhythmOsc.start(currentTime);

        // Detener osciladores
        bassOsc.stop(currentTime + duration);
        melodyOsc.stop(currentTime + duration);
        rhythmOsc.stop(currentTime + duration);

        this.earthquake.music = { bassOsc, melodyOsc, rhythmOsc };
    }

    createEarthquakeRumble() {
        if(!this.audioContext) return;

        const duration = 5;
        const currentTime = this.audioContext.currentTime;

        // Sonido de temblor profundo
        const rumbleOsc = this.audioContext.createOscillator();
        const rumbleGain = this.audioContext.createGain();
        rumbleOsc.type = 'sawtooth';
        rumbleOsc.frequency.setValueAtTime(30, currentTime);
        rumbleOsc.frequency.linearRampToValueAtTime(60, currentTime + duration);

        rumbleGain.gain.setValueAtTime(0, currentTime);
        rumbleGain.gain.linearRampToValueAtTime(0.8, currentTime + 0.5);
        rumbleGain.gain.setValueAtTime(0.8, currentTime + duration - 1);
        rumbleGain.gain.linearRampToValueAtTime(0, currentTime + duration);

        // Filtro para sonido más profundo
        const lowPassFilter = this.audioContext.createBiquadFilter();
        lowPassFilter.type = 'lowpass';
        lowPassFilter.frequency.setValueAtTime(100, currentTime);

        rumbleOsc.connect(rumbleGain);
        rumbleGain.connect(lowPassFilter);
        lowPassFilter.connect(this.audioContext.destination);

        rumbleOsc.start(currentTime);
        rumbleOsc.stop(currentTime + duration);
    }

    createApocalypseSiren() {
        const duration = 12; // 12 segundos de sirena (más largo)
        const currentTime = this.audioContext.currentTime;

        // Sirena principal - sonido ondulante característico MÁS FUERTE
        const mainOscillator = this.audioContext.createOscillator();
        const mainGain = this.audioContext.createGain();
        const modulator = this.audioContext.createOscillator();
        const modulatorGain = this.audioContext.createGain();

        // Configurar modulador para el efecto ondulante MÁS INTENSO
        modulator.frequency.setValueAtTime(1.5, currentTime); // Más rápido para más intensidad
        modulatorGain.gain.setValueAtTime(350, currentTime); // Mayor profundidad de modulación

        // Conectar modulador a la frecuencia principal
        modulator.connect(modulatorGain);
        modulatorGain.connect(mainOscillator.frequency);

        // Frecuencia base de la sirena MÁS PENETRANTE
        mainOscillator.frequency.setValueAtTime(500, currentTime); // Frecuencia más alta
        mainOscillator.type = 'sawtooth'; // Sonido más áspero y penetrante

        // Volumen principal MÁS FUERTE
        mainGain.gain.setValueAtTime(0, currentTime);
        mainGain.gain.linearRampToValueAtTime(0.7, currentTime + 0.3); // Más fuerte y más rápido
        mainGain.gain.setValueAtTime(0.7, currentTime + duration - 0.5);
        mainGain.gain.linearRampToValueAtTime(0, currentTime + duration);

        // Segunda sirena una octava más alta para armonía
        const harmonyOscillator = this.audioContext.createOscillator();
        const harmonyGain = this.audioContext.createGain();
        const harmonyModulator = this.audioContext.createOscillator();
        const harmonyModulatorGain = this.audioContext.createGain();

        harmonyModulator.frequency.setValueAtTime(1.2, currentTime); // Ligeramente diferente
        harmonyModulatorGain.gain.setValueAtTime(150, currentTime);

        harmonyModulator.connect(harmonyModulatorGain);
        harmonyModulatorGain.connect(harmonyOscillator.frequency);

        harmonyOscillator.frequency.setValueAtTime(600, currentTime);
        harmonyOscillator.type = 'triangle';

        harmonyGain.gain.setValueAtTime(0, currentTime);
        harmonyGain.gain.linearRampToValueAtTime(0.2, currentTime + 0.7);
        harmonyGain.gain.setValueAtTime(0.2, currentTime + duration - 1);
        harmonyGain.gain.linearRampToValueAtTime(0, currentTime + duration);

        // Sirena grave para profundidad
        const bassOscillator = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        const bassModulator = this.audioContext.createOscillator();
        const bassModulatorGain = this.audioContext.createGain();

        bassModulator.frequency.setValueAtTime(0.6, currentTime);
        bassModulatorGain.gain.setValueAtTime(100, currentTime);

        bassModulator.connect(bassModulatorGain);
        bassModulatorGain.connect(bassOscillator.frequency);

        bassOscillator.frequency.setValueAtTime(200, currentTime);
        bassOscillator.type = 'square';

        bassGain.gain.setValueAtTime(0, currentTime);
        bassGain.gain.linearRampToValueAtTime(0.3, currentTime + 1);
        bassGain.gain.setValueAtTime(0.3, currentTime + duration - 1.5);
        bassGain.gain.linearRampToValueAtTime(0, currentTime + duration);

        // Efectos de distorsión y filtro para sonido más apocalíptico
        const distortion = this.audioContext.createWaveShaper();
        const filterNode = this.audioContext.createBiquadFilter();
        const masterGain = this.audioContext.createGain();

        // Crear curva de distorsión
        const samples = 44100;
        const curve = new Float32Array(samples);
        const degree = 50;
        for(let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = (3 + degree) * x * 20 * Math.PI / 180 / (Math.PI + degree * Math.abs(x));
        }
        distortion.curve = curve;
        distortion.oversample = '4x';

        // Filtro pasa-bajo para suavizar la distorsión
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(1500, currentTime);
        filterNode.Q.setValueAtTime(0.7, currentTime);

        // Volumen maestro MÁS FUERTE
        masterGain.gain.setValueAtTime(0.9, currentTime);

        // Conectar todo
        mainOscillator.connect(mainGain);
        harmonyOscillator.connect(harmonyGain);
        bassOscillator.connect(bassGain);

        mainGain.connect(distortion);
        harmonyGain.connect(distortion);
        bassGain.connect(distortion);

        distortion.connect(filterNode);
        filterNode.connect(masterGain);
        masterGain.connect(this.audioContext.destination);

        // Iniciar todos los osciladores
        mainOscillator.start(currentTime);
        modulator.start(currentTime);
        harmonyOscillator.start(currentTime);
        harmonyModulator.start(currentTime);
        bassOscillator.start(currentTime);
        bassModulator.start(currentTime);

        // Detener todos los osciladores
        mainOscillator.stop(currentTime + duration);
        modulator.stop(currentTime + duration);
        harmonyOscillator.stop(currentTime + duration);
        harmonyModulator.stop(currentTime + duration);
        bassOscillator.stop(currentTime + duration);
        bassModulator.stop(currentTime + duration);

        // Programar repetición de la sirena cada 5 segundos mientras la alarma esté activa (MÁS CONSTANTE)
        if(this.alarmSystem.isActive) {
            setTimeout(() => {
                if(this.alarmSystem.isActive) {
                    this.createApocalypseSiren();
                }
            }, 5000); // Cada 5 segundos en lugar de 10
        }
    }

    collectSupply(supply) {
        supply.userData.collected = true;
        supply.visible = false;
        this.player.supplies++;
        document.getElementById('supplies-count').textContent = this.player.supplies;

        // Find and hide glow effect
        const supplyData = this.supplies.find(s => s.mesh === supply);
        if(supplyData) {
            supplyData.glow.visible = false;
        }
    }

    activateGenerator(generator) {
        generator.userData.activated = true;
        generator.userData.cooldown = 10; // 10 seconds active
        generator.material.color.setHex(0x00ff00);
        this.player.generators++;
        document.getElementById('generators-count').textContent = this.player.generators;

        // Repel zombies temporarily
        this.repelZombies(generator.position, 20);
    }

    repelZombies(position, radius) {
        this.zombies.forEach(zombie => {
            const distance = zombie.mesh.position.distanceTo(position);
            if(distance < radius) {
                const direction = zombie.mesh.position.clone().sub(position).normalize();
                zombie.velocity.add(direction.multiplyScalar(10));
            }
        });
    }

    togglePause() {
        if(this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('menu-overlay').classList.remove('hidden');
        }
    }

    // Simplified physics collision detection
    checkGroundCollision(position) {
        return position.y <= 2; // Simple ground level check
    }

    updatePlayer(deltaTime) {
        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();

        this.camera.getWorldDirection(direction);

        if(this.controls.moveForward) velocity.add(direction);
        if(this.controls.moveBackward) velocity.sub(direction);
        if(this.controls.moveLeft) {
            const left = new THREE.Vector3();
            left.crossVectors(this.camera.up, direction).normalize();
            velocity.add(left);
        }
        if(this.controls.moveRight) {
            const right = new THREE.Vector3();
            right.crossVectors(direction, this.camera.up).normalize();
            velocity.add(right);
        }

        velocity.y = 0;
        velocity.normalize();

        const speed = this.player.isRunning ? this.player.speed * 1.5 : this.player.speed;

        // Apply horizontal movement
        this.player.velocity.x = velocity.x * speed;
        this.player.velocity.z = velocity.z * speed;

        // Apply gravity
        if(!this.player.onGround) {
            this.player.velocity.y += this.gravity * deltaTime;
        }

        // Update position
        this.player.position.add(this.player.velocity.clone().multiplyScalar(deltaTime));

        // Ground collision
        if(this.checkGroundCollision(this.player.position)) {
            this.player.position.y = 2;
            this.player.velocity.y = 0;
            this.player.onGround = true;
        }

        // Update camera position
        this.camera.position.copy(this.player.position);
        this.camera.position.y += 1.6;

        // Update flashlight
        this.player.flashlight.position.copy(this.camera.position);
        const target = new THREE.Vector3();
        this.camera.getWorldDirection(target);
        target.add(this.camera.position);
        this.player.flashlight.target.position.copy(target);

        // Update stamina
        if(this.player.isRunning && velocity.length() > 0) {
            this.player.stamina = Math.max(0, this.player.stamina - deltaTime * 20);
        } else {
            this.player.stamina = Math.min(100, this.player.stamina + deltaTime * 10);
        }

        this.updateHUD();
    }

    updateZombies(deltaTime) {
        this.zombies.forEach(zombie => {
            // AI behavior
            const playerDistance = zombie.mesh.position.distanceTo(this.player.position);

            if(playerDistance < zombie.sightRange || 
               (this.player.flashlight.visible && playerDistance < zombie.hearingRange)) {

                // Move towards player
                const direction = new THREE.Vector3()
                    .copy(this.player.position)
                    .sub(zombie.mesh.position)
                    .normalize();

                zombie.velocity.x = direction.x * zombie.speed;
                zombie.velocity.z = direction.z * zombie.speed;

                // Look at player
                zombie.mesh.lookAt(this.player.position);

                // Try to climb if near rope
                const ropeDistance = zombie.mesh.position.distanceTo(this.rope.position);
                if(ropeDistance < 5 && !zombie.isClimbing) {
                    zombie.isClimbing = true;
                    zombie.velocity.y = 5;
                }
            } else {
                // Random movement if no target
                if(Math.random() < 0.01) {
                    zombie.velocity.x = (Math.random() - 0.5) * zombie.speed * 0.5;
                    zombie.velocity.z = (Math.random() - 0.5) * zombie.speed * 0.5;
                }
            }

            // Update zombie position
            zombie.mesh.position.add(zombie.velocity.clone().multiplyScalar(deltaTime));

            // Ground collision for zombies
            if(zombie.mesh.position.y < 1) {
                zombie.mesh.position.y = 1;
                zombie.velocity.y = 0;
                zombie.isClimbing = false;
            }

            // Friction
            zombie.velocity.multiplyScalar(0.9);
        });
    }

    updateRope(deltaTime) {
        if(!this.rope) return;

        // Calculate rope tension based on zombies nearby
        let tension = 0;
        this.zombies.forEach(zombie => {
            const distance = zombie.mesh.position.distanceTo(this.rope.position);
            if(distance < 10) {
                tension += (10 - distance) / 10;
            }
        });

        this.ropeTension = Math.min(100, tension * 20);

        // Visual rope sagging
        const sag = this.ropeTension / 100;
        this.rope.position.y = this.rope.userData.originalY - sag * 2;
        this.rope.rotation.z = (Math.random() - 0.5) * sag * 0.1;

        // Update HUD
        document.querySelector('.tension-fill').style.width = this.ropeTension + '%';

        // Rope breaking point
        if(this.ropeTension > 90) {
            document.querySelector('.tension-meter').style.borderColor = '#ff0000';
            document.querySelector('.tension-fill').style.background = '#ff0000';
        } else {
            document.querySelector('.tension-meter').style.borderColor = '#ffff00';
            document.querySelector('.tension-fill').style.background = 'linear-gradient(90deg, #ffff00, #ff0000)';
        }
    }

    updateGenerators(deltaTime) {
        this.generators.forEach(generator => {
            if(generator.userData.activated && generator.userData.cooldown > 0) {
                generator.userData.cooldown -= deltaTime;

                // Flickering effect
                const intensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
                generator.material.color.setRGB(0, intensity, 0);

                if(generator.userData.cooldown <= 0) {
                    generator.userData.activated = false;
                    generator.material.color.setHex(0x666666);
                }
            }
        });
    }

    updateParticles(deltaTime) {
        if(!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;
        const velocities = this.particles.geometry.attributes.velocity.array;

        for(let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i] * deltaTime;
            positions[i + 1] += velocities[i + 1] * deltaTime;
            positions[i + 2] += velocities[i + 2] * deltaTime;

            // Reset particles that fall too low
            if(positions[i + 1] < 0) {
                positions[i + 1] = 50;
                positions[i] = (Math.random() - 0.5) * 200;
                positions[i + 2] = (Math.random() - 0.5) * 200;
            }
        }

        this.particles.geometry.attributes.position.needsUpdate = true;

        // Update smoke effects mejorados
        this.scene.children.forEach(child => {
            if(child.userData && child.userData.type === 'smokeGroup') {
                child.children.forEach(smokeLayer => {
                    if(smokeLayer.userData.type === 'mainSmoke' || 
                       smokeLayer.userData.type === 'lightSmoke' || 
                       smokeLayer.userData.type === 'sparks') {

                        const smokePositions = smokeLayer.geometry.attributes.position.array;
                        const smokeVelocities = smokeLayer.geometry.attributes.velocity.array;

                        for(let i = 0; i < smokePositions.length; i += 3) {
                            // Movimiento base
                            smokePositions[i] += smokeVelocities[i] * deltaTime;
                            smokePositions[i + 1] += smokeVelocities[i + 1] * deltaTime;
                            smokePositions[i + 2] += smokeVelocities[i + 2] * deltaTime;

                            // Efectos de viento turbulento
                            const turbulence = Math.sin(Date.now() * 0.001 + i) * 0.5;
                            smokeVelocities[i] += turbulence * deltaTime;
                            smokeVelocities[i + 2] += Math.cos(Date.now() * 0.0015 + i) * 0.3 * deltaTime;

                            // Expansión del humo a medida que sube
                            if(smokeLayer.userData.type === 'mainSmoke') {
                                smokeVelocities[i] *= 1.01; // Expansión horizontal
                                smokeVelocities[i + 2] *= 1.01;
                            }

                            // Reset particles que van muy alto
                            const maxHeight = smokeLayer.userData.type === 'lightSmoke' ? 30 : 20;
                            if(smokePositions[i + 1] > maxHeight) {
                                smokePositions[i] = child.userData.baseX + (Math.random() - 0.5) * 4;
                                smokePositions[i + 1] = Math.random() * 2;
                                smokePositions[i + 2] = child.userData.baseZ + (Math.random() - 0.5) * 4;

                                smokeVelocities[i] = (Math.random() - 0.5) * 0.8;
                                smokeVelocities[i + 1] = 1.5 + Math.random() * 3;
                                smokeVelocities[i + 2] = (Math.random() - 0.5) * 0.8;
                            }

                            // Chispas caen por gravedad
                            if(smokeLayer.userData.type === 'sparks') {
                                smokeVelocities[i + 1] -= this.gravity * deltaTime * 0.1;

                                if(smokePositions[i + 1] < 0) {
                                    smokePositions[i] = child.userData.baseX + (Math.random() - 0.5) * 2;
                                    smokePositions[i + 1] = Math.random() * 2;
                                    smokePositions[i + 2] = child.userData.baseZ + (Math.random() - 0.5) * 2;

                                    smokeVelocities[i] = (Math.random() - 0.5) * 2;
                                    smokeVelocities[i + 1] = 2 + Math.random() * 4;
                                    smokeVelocities[i + 2] = (Math.random() - 0.5) * 2;
                                }
                            }
                        }

                        smokeLayer.geometry.attributes.position.needsUpdate = true;

                        // Efectos visuales dinámicos
                        if(smokeLayer.userData.type === 'mainSmoke') {
                            // Cambio de opacidad basado en viento
                            const windEffect = Math.sin(Date.now() * 0.002) * 0.1;
                            smokeLayer.material.opacity = 0.6 + windEffect;
                        }

                        if(smokeLayer.userData.type === 'sparks') {
                            // Parpadeo de chispas
                            smokeLayer.material.opacity = 0.4 + Math.random() * 0.4;
                        }
                    }
                });
            }

            // Mantener compatibilidad con humo viejo
            else if(child.userData && (child.userData.type === 'smoke' || child.userData.type === 'carSmoke')) {
                const smokePositions = child.geometry.attributes.position.array;
                const smokeVelocities = child.geometry.attributes.velocity.array;

                for(let i = 0; i < smokePositions.length; i += 3) {
                    smokePositions[i] += smokeVelocities[i] * deltaTime;
                    smokePositions[i + 1] += smokeVelocities[i + 1] * deltaTime;smokePositions[i + 2] += smokeVelocities[i + 2] * deltaTime;

                    if(smokePositions[i + 1] > 15) {
                        smokePositions[i + 1] = 1;
                        smokeVelocities[i + 1] = 0.5 + Math.random();
                    }

                    smokeVelocities[i] += (Math.random() - 0.5) * 0.1 * deltaTime;
                    smokeVelocities[i + 2] += (Math.random() - 0.5) * 0.1 * deltaTime;
                }

                child.geometry.attributes.position.needsUpdate = true;

                if(child.material.opacity > 0.1) {
                    child.material.opacity -= deltaTime * 0.05;
                }
            }
        });
    }

    updateLighting(deltaTime) {
        // Flicker emergency lights and sparks
        this.scene.children.forEach(child => {
            if(child.type === 'PointLight' && child.userData.flickerSpeed) {
                const time = Date.now() * child.userData.flickerSpeed;
                if(child.userData.type === 'spark') {
                    // Chispas más erráticas
                    child.intensity = child.userData.originalIntensity * (Math.random() > 0.8 ? 1 : 0);
                } else {
                    // Luces de emergencia normales
                    child.intensity = child.userData.originalIntensity * (0.5 + Math.sin(time) * 0.5);
                }
            }
        });
    }

    updateAlarmSystem(deltaTime) {
        const currentTime = Date.now() / 1000; // tiempo en segundos

        // Verificar si debe activarse la alarma (cada 1.5 minutos - MÁS FRECUENTE)
        if(!this.alarmSystem.isActive && 
           currentTime - this.alarmSystem.lastAlarmTime > this.alarmSystem.alarmInterval) {
            this.activateAlarm();
        }

        // Verificar si debe desactivarse la alarma (después de 45 segundos)
        if(this.alarmSystem.isActive && 
           currentTime - this.alarmSystem.lastAlarmTime > this.alarmSystem.alarmDuration) {
            this.deactivateAlarm();
        }

        // Actualizar aurora boreal
        this.updateAuroraBoreal(deltaTime);

        // Actualizar luces giratorias de alarma
        if(this.alarmSystem.isActive) {
            this.scene.traverse((child) => {
                if(child.userData && child.userData.type === 'alarmLight') {
                    child.rotation.y += child.userData.rotationSpeed * deltaTime;

                    // Efecto de parpadeo intenso
                    const intensity = Math.sin(currentTime * 10) * 0.5 + 0.5;
                    child.material.opacity = 0.5 + intensity * 0.5;
                }

                if(child.userData && child.userData.type === 'alarmPointLight') {
                    // Luces point giratorias y parpadeantes
                    const intensity = Math.sin(currentTime * 8) * 0.8 + 0.2;
                    child.intensity = child.userData.originalIntensity * intensity;

                    // Girar la luz
                    child.rotation.y += 3 * deltaTime;
                }
            });
        }
    }

    startEarthquake() {
        if(this.earthquake.hasStarted) return;

        this.earthquake.isActive = true;
        this.earthquake.hasStarted = true;
        this.earthquake.startTime = Date.now() / 1000;

        // Reproducir música dramática de terremoto
        this.createEarthquakeMusic();

        // Sonido inicial de terremoto
        this.createEarthquakeRumble();

        // Mensaje de advertencia
        this.showMessage("¡TERREMOTO! ¡BUSCA REFUGIO INMEDIATAMENTE!");

        // Cambiar ambiente visual
        this.scene.fog.density = 0.03;
        this.scene.fog.color.setHex(0x553322);

        // Programar colapso de edificios
        this.scheduleEarthquakeEvents();

        console.log("¡TERREMOTO INICIADO! Supervive durante 60 segundos!");
    }

    scheduleEarthquakeEvents() {
        // Eventos inmediatos y constantes
        const events = [
            { time: 1, action: 'collapseBuilding', buildingIndex: 0 },
            { time: 2, action: 'collapseBuilding', buildingIndex: 1 },
            { time: 3, action: 'createGroundCrack', x: -20, z: -30 },
            { time: 4, action: 'collapseBuilding', buildingIndex: 2 },
            { time: 6, action: 'collapseBuilding', buildingIndex: 3 },
            { time: 8, action: 'createGroundCrack', x: 40, z: 20 },
            { time: 10, action: 'collapseBuilding', buildingIndex: 4 },
            { time: 12, action: 'collapseBuilding', buildingIndex: 5 },
            { time: 15, action: 'createGroundCrack', x: -50, z: 40 },
            { time: 18, action: 'collapseBuilding', buildingIndex: 6 },
            { time: 20, action: 'collapseBuilding', buildingIndex: 7 },
            { time: 25, action: 'collapseBuilding', buildingIndex: 8 },
            { time: 30, action: 'collapseBuilding', buildingIndex: 9 },
            { time: 35, action: 'collapseBuilding', buildingIndex: 10 },
            { time: 40, action: 'collapseBuilding', buildingIndex: 11 }
        ];

        events.forEach(event => {
            setTimeout(() => {
                if(this.earthquake.isActive) {
                    this.executeEarthquakeEvent(event);
                }
            }, event.time * 1000);
        });

        // Meteoritos cada 3 segundos
        this.earthquake.nextMeteoriteTime = 3;
        
        // Explosiones cada 5 segundos
        this.earthquake.nextExplosionTime = 5;
    }

    executeEarthquakeEvent(event) {
        switch(event.action) {
            case 'collapseBuilding':
                this.collapseBuilding(event.buildingIndex);
                break;
            case 'createGroundCrack':
                this.createGroundCrack(event.x, event.z);
                break;
            case 'createMeteorite':
                this.createMeteorite(event.x, event.z);
                break;
            case 'createExplosion':
                this.createExplosion(event.x, event.z);
                break;
        }
    }

    collapseBuilding(index) {
        if(index >= this.buildings.length) return;

        const building = this.buildings[index];
        if(!building || building.userData.collapsed) return;

        building.userData.collapsed = true;
        building.userData.collapseSpeed = 2 + Math.random() * 3;
        building.userData.fallDirection = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            -1,
            (Math.random() - 0.5) * 0.5
        );

        this.earthquake.collapsingBuildings.push(building);

        // Sonido de colapso
        this.createBuildingCollapseSound();

        // Crear escombros
        this.createCollapseDebris(building.position);

        // Mensaje de peligro
        this.showMessage("¡EDIFICIO COLAPSANDO! ¡ALÉJATE!");
    }

    createGroundCrack(x, z) {
        const crackGeometry = new THREE.PlaneGeometry(20, 2, 10, 1);
        const crackMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.8 
        });

        // Deformar la grieta
        const vertices = crackGeometry.attributes.position.array;
        for(let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] += (Math.random() - 0.5) * 0.5;
        }
        crackGeometry.attributes.position.needsUpdate = true;

        const crack = new THREE.Mesh(crackGeometry, crackMaterial);
        crack.rotation.x = -Math.PI / 2;
        crack.rotation.z = Math.random() * Math.PI;
        crack.position.set(x, 0.05, z);

        this.scene.add(crack);
        this.earthquake.groundCracks.push(crack);

        // Sonido de grieta
        this.createGroundCrackSound();
    }

    createBuildingCollapseSound() {
        if(!this.audioContext) return;

        const duration = 3;
        const currentTime = this.audioContext.currentTime;

        // Sonido de colapso con múltiples frecuencias
        for(let i = 0; i < 5; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(50 + i * 20, currentTime);
            osc.frequency.linearRampToValueAtTime(20 + i * 10, currentTime + duration);

            gain.gain.setValueAtTime(0, currentTime);
            gain.gain.linearRampToValueAtTime(0.3, currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.start(currentTime + i * 0.1);
            osc.stop(currentTime + duration);
        }
    }

    createGroundCrackSound() {
        if(!this.audioContext) return;

        const duration = 2;
        const currentTime = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, currentTime);
        osc.frequency.linearRampToValueAtTime(40, currentTime + duration);

        gain.gain.setValueAtTime(0, currentTime);
        gain.gain.linearRampToValueAtTime(0.4, currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start(currentTime);
        osc.stop(currentTime + duration);
    }

    createCollapseDebris(position) {
        for(let i = 0; i < 15; i++) {
            const debrisGeometry = new THREE.BoxGeometry(
                0.5 + Math.random() * 2,
                0.5 + Math.random() * 2,
                0.5 + Math.random() * 2
            );
            const debrisMaterial = new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(0, 0, 0.1 + Math.random() * 0.3) 
            });
            const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);

            debris.position.set(
                position.x + (Math.random() - 0.5) * 10,
                position.y + Math.random() * 5,
                position.z + (Math.random() - 0.5) * 10
            );

            debris.userData = {
                type: 'fallingDebris',
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    Math.random() * 5,
                    (Math.random() - 0.5) * 5
                ),
                angularVelocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2
                )
            };

            debris.castShadow = true;
            this.scene.add(debris);
            this.earthquake.fallingDebris.push(debris);
        }
    }

    activateAlarm() {
        this.alarmSystem.isActive = true;
        this.alarmSystem.lastAlarmTime = Date.now() / 1000;

        // Activar todas las luces de alarma
        this.alarmSystem.lights.forEach(light => {
            light.intensity = light.userData.originalIntensity;
            light.visible = true;
        });

        // Reproducir sonido de alarma apocalíptica inmediatamente
        this.playSound('alarm');

        // Hacer que la ciudad se vea más alarmante
        this.scene.fog.density = 0.02; // Más niebla durante la alarma
        this.scene.fog.color.setHex(0x440000); // Niebla rojiza durante alarma

        // Mostrar mensaje de alarma
        this.showMessage("¡SIRENA DE EMERGENCIA - EVACUACIÓN INMEDIATA!");

        console.log("Sistema de alarma activado - Sonido continuo por 30 segundos");
    }

    deactivateAlarm() {
        this.alarmSystem.isActive = false;

        // Desactivar todas las luces de alarma
        this.alarmSystem.lights.forEach(light => {
            light.intensity = 0;
        });

        // Restaurar niebla
        this.scene.fog.density = 0.01;
        this.scene.fog.color.setHex(0x330000); // Color normal de niebla

        // Reiniciar las luces giratorias
        this.scene.traverse((child) => {
            if(child.userData && child.userData.type === 'alarmLight') {
                child.material.opacity = 0.3;
            }
        });

        console.log("Sistema de alarma desactivado - Próxima alarma en 5 minutos");
    }

    updateHUD() {
        document.querySelector('.health-fill').style.width = this.player.health + '%';
        document.querySelector('.stamina-fill').style.width = this.player.stamina + '%';

        if(this.player.health < 30) {
            document.querySelector('.health-fill').style.background = '#ff0000';
        } else if(this.player.health < 60) {
            document.querySelector('.health-fill').style.background = 'linear-gradient(90deg, #ff6600, #ff0000)';
        } else {
            document.querySelector('.health-fill').style.background = 'linear-gradient(90deg, #ff0000, #ff6666)';
        }
    }

    updateEarthquake(deltaTime) {
        const currentTime = this.clock.elapsedTime;

        // Actualizar el contador de tiempo restante
        const timeUntilEarthquake = this.earthquake.startTime - currentTime;
        const countdownDisplay = document.getElementById('earthquake-countdown');

        if (countdownDisplay) {
            if (timeUntilEarthquake > 0) {
                const minutes = Math.floor(timeUntilEarthquake / 60);
                const seconds = Math.floor(timeUntilEarthquake % 60);
                countdownDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                
                // Cambiar color a crítico cuando quedan menos de 5 segundos
                if (timeUntilEarthquake <= 5) {
                    countdownDisplay.parentElement.classList.add('earthquake-countdown-critical');
                } else {
                    countdownDisplay.parentElement.classList.remove('earthquake-countdown-critical');
                }
            } else if (!this.earthquake.hasStarted){
                countdownDisplay.textContent = "¡¡¡TERREMOTO!!!";
                countdownDisplay.parentElement.classList.add('earthquake-countdown-critical');
            } else if (this.earthquake.isActive) {
                // Mostrar tiempo restante del terremoto
                const earthquakeTime = currentTime - this.earthquake.startTime;
                const timeLeft = this.earthquake.duration - earthquakeTime;
                if (timeLeft > 0) {
                    const minutes = Math.floor(timeLeft / 60);
                    const seconds = Math.floor(timeLeft % 60);
                    countdownDisplay.textContent = `¡CORRE! ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                } else {
                    countdownDisplay.textContent = "¡SOBREVIVISTE!";
                }
            }
        }

        // Verificar si debe iniciar el terremoto
        if(!this.earthquake.hasStarted && currentTime >= this.earthquake.startTime) {
            this.startEarthquake();
        }

        if(!this.earthquake.isActive) return;

        const earthquakeTime = currentTime - this.earthquake.startTime;

        // Verificar si debe terminar el terremoto
        if(earthquakeTime >= this.earthquake.duration) {
            this.endEarthquake();
            return;
        }

        // Intensidad del terremoto - MUCHO MÁS INTENSO DESDE EL INICIO
        this.earthquake.intensity = this.earthquake.maxIntensity; // Intensidad máxima todo el tiempo

        // TEMBLOR EXTREMO DE LA CÁMARA
        const shakeIntensity = this.earthquake.intensity * 0.4; // 4 veces más intenso
        this.earthquake.cameraShake.x = (Math.random() - 0.5) * shakeIntensity;
        this.earthquake.cameraShake.y = (Math.random() - 0.5) * shakeIntensity * 0.8;
        this.earthquake.cameraShake.z = (Math.random() - 0.5) * shakeIntensity;

        // Aplicar temblor violento constante
        this.camera.position.x = this.player.position.x + this.earthquake.cameraShake.x;
        this.camera.position.y = this.player.position.y + 1.6 + this.earthquake.cameraShake.y;
        this.camera.position.z = this.player.position.z + this.earthquake.cameraShake.z;

        // Temblor violento del suelo
        if(this.ground) {
            this.ground.position.y = (Math.random() - 0.5) * shakeIntensity * 2;
            this.ground.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * shakeIntensity * 0.1;
            this.ground.rotation.z = (Math.random() - 0.5) * shakeIntensity * 0.05;
        }

        // METEORITOS - Crear uno cada X tiempo
        if(earthquakeTime >= this.earthquake.nextMeteoriteTime) {
            this.createMeteorite();
            this.earthquake.nextMeteoriteTime += 3; // Cada 3 segundos
        }

        // EXPLOSIONES - Crear una cada X tiempo
        if(earthquakeTime >= this.earthquake.nextExplosionTime) {
            this.createRandomExplosion();
            this.earthquake.nextExplosionTime += 4; // Cada 4 segundos
        }

        // Actualizar meteoritos
        this.updateMeteorites(deltaTime);

        // Actualizar explosiones
        this.updateExplosions(deltaTime);

        // Actualizar edificios colapsando RÁPIDAMENTE
        this.earthquake.collapsingBuildings.forEach((building, index) => {
            if(building.userData.collapsed) {
                building.rotation.x += building.userData.fallDirection.x * building.userData.collapseSpeed * deltaTime * 3; // 3x más rápido
                building.rotation.z += building.userData.fallDirection.z * building.userData.collapseSpeed * deltaTime * 3;
                building.position.y -= building.userData.collapseSpeed * deltaTime * 6; // 6x más rápido

                // Remover edificio cuando toque el suelo
                if(building.position.y < -3) {
                    // Crear explosión cuando el edificio toca el suelo
                    this.createExplosion(building.position.x, building.position.z);
                    this.scene.remove(building);
                    this.earthquake.collapsingBuildings.splice(index, 1);
                }
            }
        });

        // Actualizar escombros cayendo MÁS RÁPIDO
        this.earthquake.fallingDebris.forEach((debris, index) => {
            if(debris.userData.type === 'fallingDebris') {
                // Aplicar física más intensa
                debris.userData.velocity.y += this.gravity * deltaTime * 2; // Caen más rápido
                debris.position.add(debris.userData.velocity.clone().multiplyScalar(deltaTime));

                // Rotación más violenta
                debris.rotation.x += debris.userData.angularVelocity.x * 3;
                debris.rotation.y += debris.userData.angularVelocity.y * 3;
                debris.rotation.z += debris.userData.angularVelocity.z * 3;

                // Verificar colisión con el suelo
                if(debris.position.y < 0.5) {
                    debris.position.y = 0.5;
                    debris.userData.velocity.y = 0;
                    debris.userData.velocity.multiplyScalar(0.1); // Menos fricción, más rebote
                    debris.userData.angularVelocity.multiplyScalar(0.3);

                    // Crear mini explosión al impactar
                    if(Math.random() > 0.7) {
                        this.createSmallExplosion(debris.position.x, debris.position.z);
                    }

                    // Convertir en escombro estático más rápido
                    setTimeout(() => {
                        debris.userData.type = 'staticDebris';
                    }, 1000);
                }
            }
        });

        // Sonidos CONSTANTES de terremoto
        if(Math.random() < 0.1) { // 10x más frecuente
            this.createEarthquakeRumble();
        }

        // Efectos de polvo CONSTANTES
        if(Math.random() < 0.3) { // 6x más frecuente
            this.createDustCloud();
        }

        // Dañar al jugador si está cerca de colapsos
        this.checkPlayerDamage();
    }

    endEarthquake() {
        this.earthquake.isActive = false;
        this.earthquake.intensity = 0;

        // Restaurar posición del suelo
        if(this.ground) {
            this.ground.position.y = 0;
            this.ground.rotation.x = -Math.PI / 2;
        }

        // Restaurar niebla
        this.scene.fog.density = 0.01;
        this.scene.fog.color.setHex(0x330000);

        // Mensaje de supervivencia
        this.showMessage("¡HAS SOBREVIVIDO AL TERREMOTO! Busca refugio seguro.");

        console.log("Terremoto terminado - ¡Supervivencia exitosa!");
    }

    createDustCloud() {
        const dustCount = 100;
        const dustGeometry = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(dustCount * 3);
        const dustVelocities = new Float32Array(dustCount * 3);

        for(let i = 0; i < dustCount; i++) {
            const i3 = i * 3;
            dustPositions[i3] = (Math.random() - 0.5) * 100;
            dustPositions[i3 + 1] = Math.random() * 5;
            dustPositions[i3 + 2] = (Math.random() - 0.5) * 100;

            dustVelocities[i3] = (Math.random() - 0.5) * 2;
            dustVelocities[i3 + 1] = 1 + Math.random() * 3;
            dustVelocities[i3 + 2] = (Math.random() - 0.5) * 2;
        }

        dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        dustGeometry.setAttribute('velocity', new THREE.BufferAttribute(dustVelocities, 3));

        const dustMaterial = new THREE.PointsMaterial({
            color: 0x8B7355,
            size: 3,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        const dust = new THREE.Points(dustGeometry, dustMaterial);
        dust.userData = { type: 'earthquakeDust', lifetime: 5 };
        this.scene.add(dust);

        // Remover polvo después de un tiempo
        setTimeout(() => {
            this.scene.remove(dust);
        }, 5000);
    }

    createMeteorite() {
        // Crear meteorito que cae del cielo
        const meteoriteGeometry = new THREE.SphereGeometry(1 + Math.random() * 2, 8, 6);
        const meteoriteMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff4400,
            transparent: true,
            opacity: 0.9
        });
        const meteorite = new THREE.Mesh(meteoriteGeometry, meteoriteMaterial);

        // Posición inicial en el cielo
        meteorite.position.set(
            (Math.random() - 0.5) * 200,
            80 + Math.random() * 20,
            (Math.random() - 0.5) * 200
        );

        // Seleccionar punto de impacto aleatorio
        const targetX = (Math.random() - 0.5) * 150;
        const targetZ = (Math.random() - 0.5) * 150;

        meteorite.userData = {
            type: 'meteorite',
            velocity: new THREE.Vector3(
                (targetX - meteorite.position.x) * 0.02,
                -25, // Velocidad de caída
                (targetZ - meteorite.position.z) * 0.02
            ),
            targetX: targetX,
            targetZ: targetZ,
            hasExploded: false,
            trail: []
        };

        // Efecto de fuego alrededor del meteorito
        const fireGeometry = new THREE.SphereGeometry(meteorite.geometry.parameters.radius * 1.5, 6, 4);
        const fireMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff8800,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        const fire = new THREE.Mesh(fireGeometry, fireMaterial);
        meteorite.add(fire);

        // Luz del meteorito
        const meteoriteLight = new THREE.PointLight(0xff4400, 3, 30);
        meteorite.add(meteoriteLight);

        this.scene.add(meteorite);
        this.earthquake.meteorites.push(meteorite);

        // Sonido de meteorito acercándose
        this.createMeteoriteSound();

        console.log("¡METEORITO CREADO! Posición:", meteorite.position, "Objetivo:", targetX, targetZ);
    }

    createExplosion(x, z) {
        // Crear explosión masiva
        const explosionGroup = new THREE.Group();

        // Esfera de explosión central
        const explosionGeometry = new THREE.SphereGeometry(3, 16, 12);
        const explosionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff3300,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.set(x, 2, z);
        explosionGroup.add(explosion);

        // Ondas de choque
        for(let i = 0; i < 3; i++) {
            const shockwaveGeometry = new THREE.RingGeometry(i * 5, (i + 1) * 6, 32);
            const shockwaveMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff6600,
                transparent: true,
                opacity: 0.5 - i * 0.15,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
            shockwave.rotation.x = -Math.PI / 2;
            shockwave.position.set(x, 0.1, z);
            explosionGroup.add(shockwave);
        }

        // Partículas de fuego
        const particleCount = 200;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleVelocities = new Float32Array(particleCount * 3);

        for(let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            particlePositions[i3] = x + (Math.random() - 0.5) * 2;
            particlePositions[i3 + 1] = 2 + Math.random() * 3;
            particlePositions[i3 + 2] = z + (Math.random() - 0.5) * 2;

            const speed = 5 + Math.random() * 10;
            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() - 0.5) * Math.PI;
            
            particleVelocities[i3] = Math.cos(angle) * Math.cos(elevation) * speed;
            particleVelocities[i3 + 1] = Math.sin(elevation) * speed;
            particleVelocities[i3 + 2] = Math.sin(angle) * Math.cos(elevation) * speed;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(particleVelocities, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0xff4400,
            size: 2,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        explosionGroup.add(particles);

        // Luz de explosión
        const explosionLight = new THREE.PointLight(0xff3300, 10, 50);
        explosionLight.position.set(x, 5, z);
        explosionGroup.add(explosionLight);

        explosionGroup.userData = {
            type: 'explosion',
            age: 0,
            maxAge: 3,
            x: x,
            z: z
        };

        this.scene.add(explosionGroup);
        this.earthquake.explosions.push(explosionGroup);

        // Sonido de explosión
        this.createExplosionSound();

        // Dañar al jugador si está cerca
        const distance = Math.sqrt((this.player.position.x - x) ** 2 + (this.player.position.z - z) ** 2);
        if(distance < 15) {
            const damage = Math.max(5, 30 - distance * 2);
            this.player.health = Math.max(0, this.player.health - damage);
            this.showMessage(`¡EXPLOSIÓN! -${Math.floor(damage)} salud`);
            
            // Efecto de empuje
            const pushDirection = new THREE.Vector3(
                this.player.position.x - x,
                0,
                this.player.position.z - z
            ).normalize();
            this.player.velocity.add(pushDirection.multiplyScalar(20));
        }

        console.log("¡EXPLOSIÓN CREADA! Posición:", x, z);
    }

    createRandomExplosion() {
        const x = (Math.random() - 0.5) * 120;
        const z = (Math.random() - 0.5) * 120;
        this.createExplosion(x, z);
    }

    createSmallExplosion(x, z) {
        // Explosión pequeña para escombros
        const explosionGeometry = new THREE.SphereGeometry(1, 8, 6);
        const explosionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff6600,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.set(x, 1, z);

        explosion.userData = {
            type: 'smallExplosion',
            age: 0,
            maxAge: 0.5
        };

        this.scene.add(explosion);
        this.earthquake.explosions.push(explosion);

        // Sonido pequeño
        this.createSmallExplosionSound();
    }

    updateMeteorites(deltaTime) {
        this.earthquake.meteorites.forEach((meteorite, index) => {
            if(meteorite.userData.type === 'meteorite' && !meteorite.userData.hasExploded) {
                // Mover meteorito
                meteorite.position.add(meteorite.userData.velocity.clone().multiplyScalar(deltaTime));

                // Rotación del meteorito
                meteorite.rotation.x += deltaTime * 3;
                meteorite.rotation.y += deltaTime * 2;

                // Crear estela de fuego
                if(meteorite.userData.trail.length < 10) {
                    const trailParticle = new THREE.Mesh(
                        new THREE.SphereGeometry(0.5, 4, 3),
                        new THREE.MeshBasicMaterial({ 
                            color: 0xff6600,
                            transparent: true,
                            opacity: 0.4,
                            blending: THREE.AdditiveBlending
                        })
                    );
                    trailParticle.position.copy(meteorite.position);
                    this.scene.add(trailParticle);
                    meteorite.userData.trail.push(trailParticle);

                    // Remover partícula después de un tiempo
                    setTimeout(() => {
                        this.scene.remove(trailParticle);
                    }, 2000);
                }

                // Verificar impacto con el suelo
                if(meteorite.position.y <= 2) {
                    meteorite.userData.hasExploded = true;
                    
                    // Crear explosión masiva
                    this.createExplosion(meteorite.position.x, meteorite.position.z);
                    
                    // Crear crater
                    this.createCrater(meteorite.position.x, meteorite.position.z);
                    
                    // Remover meteorito
                    this.scene.remove(meteorite);
                    this.earthquake.meteorites.splice(index, 1);

                    console.log("¡METEORITO IMPACTÓ! Posición:", meteorite.position.x, meteorite.position.z);
                }
            }
        });
    }

    updateExplosions(deltaTime) {
        this.earthquake.explosions.forEach((explosion, index) => {
            explosion.userData.age += deltaTime;

            if(explosion.userData.type === 'explosion') {
                // Expandir explosión
                const scale = 1 + explosion.userData.age * 2;
                explosion.scale.set(scale, scale, scale);

                // Reducir opacidad
                const opacity = 1 - (explosion.userData.age / explosion.userData.maxAge);
                explosion.children.forEach(child => {
                    if(child.material) {
                        child.material.opacity = opacity * (child.material.userData?.baseOpacity || 0.8);
                    }
                });

                // Remover cuando expire
                if(explosion.userData.age >= explosion.userData.maxAge) {
                    this.scene.remove(explosion);
                    this.earthquake.explosions.splice(index, 1);
                }
            } else if(explosion.userData.type === 'smallExplosion') {
                // Expandir y desvanecer explosión pequeña
                const scale = 1 + explosion.userData.age * 4;
                explosion.scale.set(scale, scale, scale);
                explosion.material.opacity = 0.7 * (1 - explosion.userData.age / explosion.userData.maxAge);

                if(explosion.userData.age >= explosion.userData.maxAge) {
                    this.scene.remove(explosion);
                    this.earthquake.explosions.splice(index, 1);
                }
            }
        });
    }

    createCrater(x, z) {
        // Crear crater en el suelo
        const craterGeometry = new THREE.CylinderGeometry(0, 8, 3, 16);
        const craterMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x221100,
            transparent: true,
            opacity: 0.8
        });
        const crater = new THREE.Mesh(craterGeometry, craterMaterial);
        crater.position.set(x, -1, z);
        crater.rotation.x = Math.PI;

        this.scene.add(crater);
    }

    checkPlayerDamage() {
        // Verificar si el jugador está en peligro

        // Daño por estar cerca de edificios colapsando
        this.earthquake.collapsingBuildings.forEach(building => {
            const distance = this.player.position.distanceTo(building.position);
            if(distance < 12 && Math.random() > 0.95) {
                this.player.health = Math.max(0, this.player.health - 2);
                this.showMessage("¡Escombros cayendo! ¡ALÉJATE!");
            }
        });

        // Daño por escombros cayendo
        this.earthquake.fallingDebris.forEach(debris => {
            const distance = this.player.position.distanceTo(debris.position);
            if(distance < 2 && debris.position.y > this.player.position.y && Math.random() > 0.8) {
                this.player.health = Math.max(0, this.player.health - 5);
                this.showMessage("¡Te golpearon los escombros! -5 salud");
            }
        });

        // Verificar si el jugador murió
        if(this.player.health <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.earthquake.isActive = false;
        this.gameState = 'gameOver';
        
        // Mostrar pantalla de game over
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.position = 'fixed';
        gameOverDiv.style.top = '0';
        gameOverDiv.style.left = '0';
        gameOverDiv.style.width = '100%';
        gameOverDiv.style.height = '100%';
        gameOverDiv.style.background = 'rgba(255,0,0,0.8)';
        gameOverDiv.style.color = '#fff';
        gameOverDiv.style.display = 'flex';
        gameOverDiv.style.flexDirection = 'column';
        gameOverDiv.style.justifyContent = 'center';
        gameOverDiv.style.alignItems = 'center';
        gameOverDiv.style.zIndex = '2000';
        gameOverDiv.style.fontSize = '3rem';
        gameOverDiv.style.fontFamily = 'Courier New, monospace';
        gameOverDiv.innerHTML = `
            <h1>¡MORISTE EN EL TERREMOTO!</h1>
            <p style="font-size: 1.5rem; margin: 20px;">No pudiste escapar de la catástrofe</p>
            <button onclick="location.reload()" style="padding: 15px 30px; font-size: 1.2rem; background: #ff0000; color: white; border: none; cursor: pointer;">REINTENTAR</button>
        `;

        document.body.appendChild(gameOverDiv);

        console.log("GAME OVER - El jugador murió en el terremoto");
    }

    createMeteoriteSound() {
        if(!this.audioContext) return;

        const duration = 4;
        const currentTime = this.audioContext.currentTime;

        // Sonido de meteorito silbando
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, currentTime);
        osc.frequency.linearRampToValueAtTime(200, currentTime + duration);

        gain.gain.setValueAtTime(0, currentTime);
        gain.gain.linearRampToValueAtTime(0.3, currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, currentTime + duration - 0.5);
        gain.gain.linearRampToValueAtTime(0, currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start(currentTime);
        osc.stop(currentTime + duration);
    }

    createExplosionSound() {
        if(!this.audioContext) return;

        const duration = 2;
        const currentTime = this.audioContext.currentTime;

        // Sonido de explosión masiva
        for(let i = 0; i < 3; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(100 - i * 20, currentTime);
            osc.frequency.exponentialRampToValueAtTime(20, currentTime + duration);

            gain.gain.setValueAtTime(0, currentTime);
            gain.gain.linearRampToValueAtTime(0.8, currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.start(currentTime + i * 0.1);
            osc.stop(currentTime + duration);
        }
    }

    createSmallExplosionSound() {
        if(!this.audioContext) return;

        const duration = 0.5;
        const currentTime = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, currentTime + duration);

        gain.gain.setValueAtTime(0, currentTime);
        gain.gain.linearRampToValueAtTime(0.4, currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start(currentTime);
        osc.stop(currentTime + duration);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if(this.gameState !== 'playing') return;

        const deltaTime = this.clock.getDelta();

        this.updatePlayer(deltaTime);
        this.updateZombies(deltaTime);
        this.updateRope(deltaTime);
        this.updateGenerators(deltaTime);
        this.updateParticles(deltaTime);
        this.updateLighting(deltaTime);
        this.updateAlarmSystem(deltaTime);
        this.updateEarthquake(deltaTime);

        this.renderer.render(this.scene, this.camera);
    }

    updateAuroraBoreal(deltaTime) {
        if(!this.auroraLights) return;

        const time = Date.now() * 0.001; // tiempo en segundos

        // Animar cada aurora con ondulaciones y cambios de color
        this.auroraLights.forEach((aurora, index) => {
            if(aurora.userData.type === 'aurora') {
                // Ondulación de opacidad
                const wave = Math.sin(time * aurora.userData.waveSpeed + index * 2) * 0.5 + 0.5;
                aurora.material.opacity = aurora.userData.baseOpacity + wave * 0.1;

                // Movimiento sutil
                aurora.position.y = 50 + index * 5 + Math.sin(time * 0.3 + index) * 3;
                aurora.rotation.z = Math.sin(time * 0.2 + index) * 0.1;

                // Cambio de color gradual
                const hue = (time * 0.1 + index * 0.3) % 1;
                if(index === 0) {
                    aurora.material.color.setHSL(0.3 + hue * 0.2, 0.8, 0.6); // Verde-azul
                } else if(index === 1) {
                    aurora.material.color.setHSL(0.6 + hue * 0.1, 0.9, 0.5); // Azul-violeta
                } else {
                    aurora.material.color.setHSL(0.8 + hue * 0.1, 0.7, 0.4); // Violeta-rosa
                }
            }
        });

        // Cambiar luz ambiental de aurora
        if(this.auroraAmbientLight) {
            const intensity = 0.05 + Math.sin(time * 0.5) * 0.03;
            this.auroraAmbientLight.intensity = intensity;
            const hue = (time * 0.1) % 1;
            this.auroraAmbientLight.color.setHSL(0.4 + hue * 0.3, 0.6, 0.5);
        }
    }
}

// Global functions for menu
function resumeGame() {
    game.gameState = 'playing';
    document.getElementById('menu-overlay').classList.add('hidden');
    game.lockPointer();
}

function restartGame() {
    location.reload();
}

function toggleSettings() {
    alert('Configuración no implementada en esta demo');
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    // Verify Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('Three.js no se cargó correctamente');
        document.getElementById('loading-screen').innerHTML = '<div class="loading-content"><h1>ERROR</h1><p>Three.js no se pudo cargar</p></div>';
        return;
    }

    console.log('Three.js cargado correctamente, iniciando simulador simplificado...');
    game = new ZombieApocalypseGame();
});

</script>

</body>
</html>