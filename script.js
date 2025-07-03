
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
        
        // Emergency alarm system
        this.alarmSystem = {
            isActive: false,
            lastAlarmTime: 0,
            alarmDuration: 30, // 30 seconds on
            alarmInterval: 300, // 5 minutes between alarms
            lights: [],
            sound: null
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
        const particleCount = 200;
        const smokeGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const ages = new Float32Array(particleCount);
        
        for(let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = x + (Math.random() - 0.5) * 4;
            positions[i3 + 1] = Math.random() * 2;
            positions[i3 + 2] = z + (Math.random() - 0.5) * 4;
            
            velocities[i3] = (Math.random() - 0.5) * 0.5;
            velocities[i3 + 1] = 1 + Math.random() * 2;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
            
            ages[i] = Math.random() * 10;
        }
        
        smokeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        smokeGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        smokeGeometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
        
        const smokeMaterial = new THREE.PointsMaterial({
            color: 0x333333,
            size: 2,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        
        const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
        smoke.userData = { type: 'smoke' };
        this.scene.add(smoke);
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
        
        // Mouse controls
        document.addEventListener('mousemove', (event) => {
            if(!this.controls.isPointerLocked) return;
            
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            
            this.camera.rotation.y -= movementX * 0.002;
            this.camera.rotation.x -= movementY * 0.002;
            this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));
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
    
    createApocalypseSiren() {
        const duration = 8; // 8 segundos de sirena
        const currentTime = this.audioContext.currentTime;
        
        // Sirena principal - sonido ondulante característico
        const mainOscillator = this.audioContext.createOscillator();
        const mainGain = this.audioContext.createGain();
        const modulator = this.audioContext.createOscillator();
        const modulatorGain = this.audioContext.createGain();
        
        // Configurar modulador para el efecto ondulante
        modulator.frequency.setValueAtTime(0.8, currentTime); // 0.8 Hz para ondulación lenta
        modulatorGain.gain.setValueAtTime(200, currentTime); // Profundidad de modulación
        
        // Conectar modulador a la frecuencia principal
        modulator.connect(modulatorGain);
        modulatorGain.connect(mainOscillator.frequency);
        
        // Frecuencia base de la sirena (típica de sirenas de emergencia)
        mainOscillator.frequency.setValueAtTime(400, currentTime);
        mainOscillator.type = 'sawtooth'; // Sonido más áspero y penetrante
        
        // Volumen principal con fade in/out
        mainGain.gain.setValueAtTime(0, currentTime);
        mainGain.gain.linearRampToValueAtTime(0.4, currentTime + 0.5);
        mainGain.gain.setValueAtTime(0.4, currentTime + duration - 1);
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
        
        // Volumen maestro
        masterGain.gain.setValueAtTime(0.6, currentTime);
        
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
        
        // Programar repetición de la sirena cada 10 segundos mientras la alarma esté activa
        if(this.alarmSystem.isActive) {
            setTimeout(() => {
                if(this.alarmSystem.isActive) {
                    this.createApocalypseSiren();
                }
            }, 10000);
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
        
        // Update smoke effects
        this.scene.children.forEach(child => {
            if(child.userData && (child.userData.type === 'smoke' || child.userData.type === 'carSmoke')) {
                const smokePositions = child.geometry.attributes.position.array;
                const smokeVelocities = child.geometry.attributes.velocity.array;
                
                for(let i = 0; i < smokePositions.length; i += 3) {
                    smokePositions[i] += smokeVelocities[i] * deltaTime;
                    smokePositions[i + 1] += smokeVelocities[i + 1] * deltaTime;
                    smokePositions[i + 2] += smokeVelocities[i + 2] * deltaTime;
                    
                    // Reset smoke particles that go too high
                    if(smokePositions[i + 1] > 15) {
                        smokePositions[i + 1] = 1;
                        smokeVelocities[i + 1] = 0.5 + Math.random();
                    }
                    
                    // Wind effect on smoke
                    smokeVelocities[i] += (Math.random() - 0.5) * 0.1 * deltaTime;
                    smokeVelocities[i + 2] += (Math.random() - 0.5) * 0.1 * deltaTime;
                }
                
                child.geometry.attributes.position.needsUpdate = true;
                
                // Fade smoke over time
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
        
        // Verificar si debe activarse la alarma (cada 5 minutos)
        if(!this.alarmSystem.isActive && 
           currentTime - this.alarmSystem.lastAlarmTime > this.alarmSystem.alarmInterval) {
            this.activateAlarm();
        }
        
        // Verificar si debe desactivarse la alarma (después de 30 segundos)
        if(this.alarmSystem.isActive && 
           currentTime - this.alarmSystem.lastAlarmTime > this.alarmSystem.alarmDuration) {
            this.deactivateAlarm();
        }
        
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
        
        // Restaurar niebla normal
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
        
        this.renderer.render(this.scene, this.camera);
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
