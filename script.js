// Global variables
let scene, camera, renderer, brain, interiorScene, interiorCamera, interiorRenderer;
let mouse = { x: 0, y: 0 };
let mouseWorldPos = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let isLoaded = false;
let currentSection = 1;
let neuralCanvas, neuralCtx;
let isMobile = false;
let isTablet = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initLoading();
    initThreeJS();
    initInteriorScene();
    initNeuralAnimation();
    initScrollAnimations();
    initEventListeners();
    initCountdownTimer();

    // Hide loading screen after everything is loaded
    setTimeout(() => {
        hideLoadingScreen();
    }, 2000);
});

// Loading screen management
function initLoading() {
    const loadingScreen = document.getElementById('loading-screen');

    // Simulate loading progress
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
        }
    }, 100);
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        isLoaded = true;
    }, 500);
}

// Three.js setup for main brain
function initThreeJS() {
    const canvas = document.getElementById('brain-canvas');
    const container = document.querySelector('.brain-container');

    // Scene setup with fog for depth
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 8, 15);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Load PROFESSIONAL 3D BRAIN MODEL
    // Using GLTFLoader to load high-quality brain model
    const loader = new THREE.GLTFLoader();

    // Option 1: Load from Sketchfab (best quality, free models)
    // Download URL: https://sketchfab.com/3d-models/human-brain-c9c9d4d671b94345952d012cc2ea7a24
    // You need to download the GLB file and place it in the project folder

    loader.load(
        // Replace this with your downloaded brain model path
        'models/brain.glb',

        // Success callback
        (gltf) => {
            brain = gltf.scene;

            // Scale the model to appropriate size
            brain.scale.set(1.5, 1.5, 1.5);

            // Apply beautiful GREEN-TO-ORANGE GRADIENT
            // Get brain bounding box for gradient calculation
            const bbox = new THREE.Box3().setFromObject(brain);
            const minY = bbox.min.y;
            const maxY = bbox.max.y;

            brain.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.material && child.geometry) {
                        // Clone material
                        child.material = child.material.clone();

                        // Remove textures
                        child.material.map = null;
                        child.material.normalMap = null;
                        child.material.roughnessMap = null;
                        child.material.metalnessMap = null;
                        child.material.aoMap = null;

                        // Enable vertex colors for gradient
                        child.material.vertexColors = true;

                        // Create gradient colors on vertices
                        const colors = [];
                        const positions = child.geometry.attributes.position;

                        // Define 7-tone REALISTIC HUMAN BRAIN gradient (smooth transitions)
                        const brainShades = [
                            new THREE.Color(0x6e938e),  // 1. Deep tissue (darkest gray-pink)
                            new THREE.Color(0xacd2c5),  // 2. White matter (gray-pink)
                            new THREE.Color(0x946a50),  // 3. Transition zone (medium pink-gray)
                            new THREE.Color(0xacd2c5),  // 4. Gray matter (pink-beige)
                            new THREE.Color(0x4b4c2a),  // 5. Upper cortex (light beige-pink)
                            new THREE.Color(0x6e938e),  // 6. Surface layer (very light)
                            new THREE.Color(0x4b4c2a)   // 7. Outer surface (lightest beige-pink)
                        ];

                        for (let i = 0; i < positions.count; i++) {
                            const y = positions.getY(i);

                            // Calculate gradient factor (0 = bottom, 1 = top)
                            const gradientFactor = (y - minY) / (maxY - minY);

                            // Determine which two colors to blend between
                            const colorCount = brainShades.length;
                            const scaledFactor = gradientFactor * (colorCount - 1);
                            const lowerIndex = Math.floor(scaledFactor);
                            const upperIndex = Math.min(lowerIndex + 1, colorCount - 1);
                            const localFactor = scaledFactor - lowerIndex;

                            // Blend between adjacent colors for smooth transitions
                            const color = new THREE.Color().lerpColors(
                                brainShades[lowerIndex],
                                brainShades[upperIndex],
                                localFactor
                            );

                            colors.push(color.r, color.g, color.b);
                        }

                        // Apply vertex colors
                        child.geometry.setAttribute('color',
                            new THREE.Float32BufferAttribute(colors, 3)
                        );

                        // Material properties for realistic human brain
                        child.material.roughness = 0.75;
                        child.material.metalness = 0.02;
                        child.material.emissive = new THREE.Color(0xd4a599); // Subtle pink-beige glow
                        child.material.emissiveIntensity = 0.15;

                        // Add slight transparency for ethereal look
                        child.material.transparent = true;
                        child.material.opacity = 0.9; // Slightly transparent (85% solid)

                        // Add neural overlay texture
                        child.material.map = createNeuralOverlayTexture();
                        child.material.map.wrapS = THREE.RepeatWrapping;
                        child.material.map.wrapT = THREE.RepeatWrapping;

                        child.material.needsUpdate = true;
                    }
                }
            });

            scene.add(brain);

            // Add MAGICAL neural veins extending outward
            createMagicalNeuralVeins(brain);

            // Add neural pathways and particles AFTER brain is loaded
            createNeuralPathways();
            createBrainParticles();

            console.log('✅ Professional 3D Brain Model Loaded Successfully!');
        },

        // Progress callback
        (progress) => {
            const percent = (progress.loaded / progress.total * 100).toFixed(0);
            console.log(`Loading brain model: ${percent}%`);
        },

        // Error callback - Fallback to procedural generation
        (error) => {
            console.warn('⚠️ Could not load 3D model, using fallback brain:', error);
            // Create fallback procedural brain with gradient
            const geometry = createDetailedBrainGeometry();

            // Apply gradient to fallback brain
            const bbox = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
            const minY = bbox.min.y;
            const maxY = bbox.max.y;

            const colors = [];
            const positions = geometry.attributes.position;

            // Same 7-tone REALISTIC HUMAN BRAIN gradient (smooth transitions)
            const brainShades = [
                new THREE.Color(0x988078),  // 1. Deep tissue (darkest gray-pink)
                new THREE.Color(0xa58b84),  // 2. White matter (gray-pink)
                new THREE.Color(0xb39590),  // 3. Transition zone (medium pink-gray)
                new THREE.Color(0xc2a199),  // 4. Gray matter (pink-beige)
                new THREE.Color(0xd0aea5),  // 5. Upper cortex (light beige-pink)
                new THREE.Color(0xddbdb2),  // 6. Surface layer (very light)
                new THREE.Color(0xe8cbc0)   // 7. Outer surface (lightest beige-pink)
            ];

            for (let i = 0; i < positions.count; i++) {
                const y = positions.getY(i);
                const gradientFactor = (y - minY) / (maxY - minY);

                const colorCount = brainShades.length;
                const scaledFactor = gradientFactor * (colorCount - 1);
                const lowerIndex = Math.floor(scaledFactor);
                const upperIndex = Math.min(lowerIndex + 1, colorCount - 1);
                const localFactor = scaledFactor - lowerIndex;

                const color = new THREE.Color().lerpColors(
                    brainShades[lowerIndex],
                    brainShades[upperIndex],
                    localFactor
                );
                colors.push(color.r, color.g, color.b);
            }

            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            const material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.75,
                metalness: 0.02,
                emissive: 0xd4a599,
                emissiveIntensity: 0.15,
                transparent: true,
                opacity: 0.3, // Match user's opacity setting (KEPT AS USER SET)
                map: createNeuralOverlayTexture() // Add neural overlay
            });

            brain = new THREE.Mesh(geometry, material);
            brain.castShadow = true;
            brain.receiveShadow = true;
            scene.add(brain);

            // Add MAGICAL neural veins for fallback brain too
            createMagicalNeuralVeins(brain);

            // Add neural pathways and particles for fallback brain too
            createNeuralPathways();
            createBrainParticles();
        }
    );

    // MEDICAL-GRADE lighting setup for maximum detail visibility

    // Ambient light - soft base illumination
    const ambientLight = new THREE.AmbientLight(0x606060, 0.5);
    scene.add(ambientLight);

    // Key light - main directional light (top-front) - BRIGHT
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(4, 7, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    // Fill light - soft fill from opposite side
    const fillLight = new THREE.DirectionalLight(0xffe8d0, 0.6);
    fillLight.position.set(-6, 4, -3);
    scene.add(fillLight);

    // Rim light - strong backlight for depth and edge definition
    const rimLight = new THREE.DirectionalLight(0xaaccff, 1.4);
    rimLight.position.set(-4, -3, -7);
    scene.add(rimLight);

    // Top highlight - shows sulci depth
    const topLight = new THREE.DirectionalLight(0xffffff, 0.8);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    // Side accent lights - reveal surface detail
    const accentLight1 = new THREE.PointLight(0x6fa99a, 0.4, 20);
    accentLight1.position.set(6, 5, 6);
    scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0x708d7e, 0.35, 18);
    accentLight2.position.set(-5, -4, 5);
    scene.add(accentLight2);

    // Neural pathways and particles are now added in the loader callbacks
    // after the brain model is successfully loaded

    // Set camera position based on device
    updateCameraForDevice();

    // Start render loop
    animate();
}

// Update camera and brain scale for device type
function updateCameraForDevice() {
    // Detect device type
    const width = window.innerWidth;
    isMobile = width <= 768;
    isTablet = width > 768 && width <= 1024;

    if (isMobile) {
        camera.position.z = 7; // Pull back more for mobile
        if (brain) {
            brain.scale.set(0.7, 0.7, 0.7); // Smaller brain for mobile
        }
    } else if (isTablet) {
        camera.position.z = 6; // Medium distance for tablet
        if (brain) {
            brain.scale.set(0.85, 0.85, 0.85); // Medium brain for tablet
        }
    } else {
        camera.position.z = 5; // Normal distance for desktop
        if (brain) {
            brain.scale.set(1, 1, 1); // Full size for desktop
        }
    }
}

// Create procedural brain texture with MEDICAL-GRADE accuracy
function createProceduralBrainTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base color - REALISTIC GRAY MATTER (cerebral cortex color)
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, '#b8a8a0');  // Light gray-beige center
    gradient.addColorStop(0.5, '#9a8a82'); // Medium gray
    gradient.addColorStop(0.8, '#7d6f68'); // Darker gray
    gradient.addColorStop(1, '#6b5d56');   // Deep gray shadows

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add realistic brain tissue patterns

    // Layer 1: Gray matter tissue variation
    for (let i = 0; i < 120; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 50 + 25;

        const tissueGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        tissueGradient.addColorStop(0, `rgba(150, 140, 130, ${Math.random() * 0.15 + 0.08})`);
        tissueGradient.addColorStop(1, 'rgba(110, 100, 95, 0)');

        ctx.fillStyle = tissueGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Layer 2: Vascular structures (blood vessels)
    ctx.strokeStyle = 'rgba(130, 110, 100, 0.2)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const length = Math.random() * 80 + 40;
        const angle = Math.random() * Math.PI * 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
            x + Math.cos(angle) * length / 2 + (Math.random() - 0.5) * 30,
            y + Math.sin(angle) * length / 2 + (Math.random() - 0.5) * 30,
            x + Math.cos(angle) * length,
            y + Math.sin(angle) * length
        );
        ctx.stroke();
    }

    // Layer 3: Fine texture detail
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // Add subtle noise for organic texture
        const noise = (Math.random() - 0.5) * 8;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
    }

    ctx.putImageData(imageData, 0, 0);

    // Layer 4: Deep sulci shadows (grooves between gyri)
    for (let i = 0; i < 250; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const width = Math.random() * 25 + 8;
        const height = Math.random() * 70 + 35;
        const angle = Math.random() * Math.PI;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = `rgba(70, 60, 55, ${Math.random() * 0.25 + 0.1})`;
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Create ULTRA-DETAILED normal map - MAKES FOLDS VISIBLE
function createNormalMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Create EXTREMELY detailed normal map for deep brain folds
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);

        // MULTI-LAYER brain fold patterns
        // Primary large folds (gyri)
        const fold1 = Math.sin(x * 0.04 + Math.sin(y * 0.03) * 4) * Math.cos(y * 0.035 + Math.cos(x * 0.04) * 3);
        const fold2 = Math.sin(x * 0.08 + Math.sin(y * 0.07) * 2.5) * Math.cos(y * 0.075 + Math.cos(x * 0.07) * 2) * 0.7;
        const fold3 = Math.sin(x * 0.15 + Math.sin(y * 0.13) * 1.5) * Math.cos(y * 0.14 + Math.cos(x * 0.13) * 1.2) * 0.4;

        // Secondary details
        const detail1 = Math.sin(x * 0.25 + y * 0.22) * Math.cos(y * 0.24) * 0.2;
        const detail2 = Math.sin(x * 0.35 + y * 0.32) * Math.cos(x * 0.33) * 0.12;

        // Deep sulci (grooves)
        const sulci = Math.sin(x * 0.06) * Math.sin(y * 0.055) * -0.3;

        // Combine for VERY DEEP organic brain folds
        const combinedFolds = (fold1 + fold2 + fold3 + detail1 + detail2 + sulci) * 0.85;

        // Convert to normal map RGB values with strong depth
        const normalX = Math.sin(x * 0.05 + combinedFolds * 5) * 0.8;
        const normalY = Math.sin(y * 0.05 + combinedFolds * 5) * 0.8;
        const normalZ = Math.sqrt(Math.max(0, 1 - normalX * normalX - normalY * normalY));

        data[i] = Math.floor((normalX * 0.5 + 0.5) * 255);     // R (X normal)
        data[i + 1] = Math.floor((normalY * 0.5 + 0.5) * 255); // G (Y normal)
        data[i + 2] = Math.floor((normalZ * 0.5 + 0.5) * 255); // B (Z normal)
        data[i + 3] = 255;                                      // A
    }

    ctx.putImageData(imageData, 0, 0);

    return new THREE.CanvasTexture(canvas);
}

// Create roughness map for realistic material variation
function createRoughnessMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base roughness
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add variation - sulci are rougher, gyri are smoother
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);

        const pattern = Math.sin(x * 0.1) * Math.cos(y * 0.1);
        const roughness = 0.6 + pattern * 0.2;

        const value = Math.floor(roughness * 255);
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }

    ctx.putImageData(imageData, 0, 0);

    return new THREE.CanvasTexture(canvas);
}

// Create bump map for additional surface depth
function createBumpMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fill with medium gray base
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);

        // Create bump pattern for gyri (raised) and sulci (lowered)
        const bump1 = Math.sin(x * 0.08) * Math.cos(y * 0.075);
        const bump2 = Math.sin(x * 0.15) * Math.cos(y * 0.14) * 0.5;
        const combined = (bump1 + bump2) * 0.4 + 0.5;

        const value = Math.floor(combined * 255);
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }

    ctx.putImageData(imageData, 0, 0);

    return new THREE.CanvasTexture(canvas);
}

// Create realistic neural/vein overlay texture
function createNeuralOverlayTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // WHITE base (not transparent) - this will multiply with vertex colors
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw realistic vein/nerve network patterns
    const veins = 100; // Number of main veins

    for (let i = 0; i < veins; i++) {
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height;

        // Vein color - darker on white base for subtle detail
        const darkness = Math.random() * 40 + 60; // Darker tones (60-100)
        const alpha = Math.random() * 0.15 + 0.1; // More subtle (0.1-0.25 opacity)
        ctx.strokeStyle = `rgba(${darkness}, ${darkness + 30}, ${darkness + 10}, ${alpha})`;
        ctx.lineWidth = Math.random() * 1.2 + 0.5; // Thin veins

        // Draw branching vein with natural curves
        ctx.beginPath();
        ctx.moveTo(startX, startY);

        let x = startX;
        let y = startY;
        const branches = Math.floor(Math.random() * 20) + 25; // 25-45 segments

        for (let j = 0; j < branches; j++) {
            const angle = Math.random() * Math.PI * 2;
            const length = Math.random() * 35 + 12;

            const nextX = x + Math.cos(angle) * length;
            const nextY = y + Math.sin(angle) * length;

            // Curved lines for organic look
            const cpX = (x + nextX) / 2 + (Math.random() - 0.5) * 25;
            const cpY = (y + nextY) / 2 + (Math.random() - 0.5) * 25;

            ctx.quadraticCurveTo(cpX, cpY, nextX, nextY);

            x = nextX;
            y = nextY;

            // Random branching
            if (Math.random() > 0.65 && j > 5) {
                const branchAngle = angle + (Math.random() - 0.5) * Math.PI / 2;
                const branchLength = Math.random() * 25 + 8;
                const branchX = x + Math.cos(branchAngle) * branchLength;
                const branchY = y + Math.sin(branchAngle) * branchLength;

                ctx.moveTo(x, y);
                ctx.lineTo(branchX, branchY);
                ctx.moveTo(x, y);
            }
        }

        ctx.stroke();
    }

    // Add small capillary details (darker for white background)
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 1.5 + 0.3;

        ctx.fillStyle = `rgba(80, 120, 90, ${Math.random() * 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
}

// Create 3D neural veins extending OUTWARD from brain (magical effect)
function createMagicalNeuralVeins(brainObject) {
    const veinGroup = new THREE.Group();
    const veinCount = 40; // More veins for dramatic effect

    for (let i = 0; i < veinCount; i++) {
        const points = [];

        // Random starting position on brain surface
        const startTheta = Math.random() * Math.PI * 2;
        const startPhi = Math.random() * Math.PI;

        let theta = startTheta;
        let phi = startPhi;

        // PHASE 1: On brain surface (15-25 segments)
        const surfaceSegments = Math.floor(Math.random() * 10) + 15;

        for (let j = 0; j < surfaceSegments; j++) {
            theta += (Math.random() - 0.5) * 0.18;
            phi += (Math.random() - 0.5) * 0.15;
            phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));

            const radius = 1.6;
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);

            points.push(new THREE.Vector3(x, y, z));
        }

        // PHASE 2: MAGICAL EXTENSION OUTWARD (35-55 segments)
        const lastPoint = points[points.length - 1];
        const direction = lastPoint.clone().normalize();

        const extensionSegments = Math.floor(Math.random() * 20) + 35;
        const maxExtension = 1.8 + Math.random() * 1.2; // Extend 1.8-3.0 units out

        for (let j = 0; j < extensionSegments; j++) {
            const progress = j / extensionSegments;

            // Gradually extend outward with magical spiraling
            const extensionAmount = progress * maxExtension;

            // Add mystical wave patterns
            const spiral = Math.sin(progress * Math.PI * 4) * 0.15 * progress;
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
            const perpendicular2 = new THREE.Vector3().crossVectors(direction, perpendicular);

            const newPoint = lastPoint.clone()
                .add(direction.clone().multiplyScalar(extensionAmount))
                .add(perpendicular.clone().multiplyScalar(spiral))
                .add(perpendicular2.clone().multiplyScalar(spiral * 0.7));

            points.push(newPoint);
        }

        if (points.length > 1) {
            const curve = new THREE.CatmullRomCurve3(points);
            const totalSegments = points.length;

            const tubeGeometry = new THREE.TubeGeometry(
                curve,
                totalSegments,
                0.006, // Base radius
                6,
                false
            );

            // Create glowing material with gradient - New color scheme
            const veinMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    color1: { value: new THREE.Color(0x6fa99a) }, // New color (teal)
                    color2: { value: new THREE.Color(0x708d7e) }, // Darker variant
                    time: { value: 0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 color1;
                    uniform vec3 color2;
                    uniform float time;
                    varying vec2 vUv;
                    
                    void main() {
                        // Gradient from green to orange
                        vec3 color = mix(color1, color2, vUv.x);
                        
                        // Fade out towards the end (magical dissipation)
                        float opacity = 0.7;
                        if (vUv.x > 0.3) {
                            float fadeProgress = (vUv.x - 0.3) / 0.7;
                            opacity = 0.7 - fadeProgress * 0.65; // Fade to 0.05
                        }
                        
                        // Add glow effect
                        float glow = 1.0 + sin(vUv.x * 20.0 - time) * 0.3;
                        vec3 finalColor = color * glow;
                        
                        gl_FragColor = vec4(finalColor, opacity);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });

            const vein = new THREE.Mesh(tubeGeometry, veinMaterial);
            veinGroup.add(vein);
        }
    }

    brainObject.add(veinGroup);
    brainObject.userData.hasVeins = true;
    brainObject.userData.veinGroup = veinGroup; // Store for animation
}

// Create ULTRA-REALISTIC MEDICAL-GRADE human brain
function createDetailedBrainGeometry() {
    const geometry = new THREE.SphereGeometry(1.5, 150, 150);  // Higher resolution for detail
    const vertices = geometry.attributes.position.array;

    for (let i = 0; i < vertices.length; i += 3) {
        let x = vertices[i];
        let y = vertices[i + 1];
        let z = vertices[i + 2];

        // ===== STEP 1: ACCURATE BRAIN PROPORTIONS =====
        // Human brain: ~17cm L × 14cm W × 13cm H
        x *= 0.85;  // Width: narrower
        y *= 0.78;  // Height: shorter
        z *= 1.0;   // Length: longest dimension

        // ===== STEP 2: VERY DEEP LONGITUDINAL FISSURE =====
        // The major groove separating left/right hemispheres
        if (Math.abs(x) < 0.35 && y > -0.3) {
            const fissureDepth = Math.pow((0.35 - Math.abs(x)) / 0.35, 0.8);
            y -= fissureDepth * 0.35; // MUCH deeper groove
            // Add slight inward curve at the fissure
            z *= 1.0 - fissureDepth * 0.05;
        }

        // ===== STEP 3: SHAPE THE FOUR MAJOR LOBES =====

        // FRONTAL LOBE (front 40% of brain, largest lobe)
        if (z > 0.4) {
            const frontAmount = (z - 0.4) / 0.6; // 0 to 1
            z *= 1.0 + frontAmount * 0.18; // Extend forward
            x *= 1.0 - frontAmount * 0.08; // Slightly narrower at front
            // Frontal lobe bulges on sides
            if (Math.abs(x) > 0.5 && Math.abs(x) < 0.8) {
                x *= 1.08;
            }
        }

        // PARIETAL LOBE (top-middle, crown of brain)
        if (y > 0.3 && z > -0.3 && z < 0.5) {
            y *= 1.08; // Bulge on top
        }

        // OCCIPITAL LOBE (back, lower back bulge)
        if (z < -0.5) {
            const backAmount = Math.abs(z + 0.5) / 0.5;
            z *= 1.0 + backAmount * 0.12; // Protrude backward
            if (y > 0) {
                y *= 1.0 + backAmount * 0.08; // Back-top bulge
            }
        }

        // TEMPORAL LOBES (sides, lower, ear level)
        if (Math.abs(x) > 0.55 && y < 0 && z > -0.4 && z < 0.4) {
            const sideAmount = (Math.abs(x) - 0.55) / 0.45;
            x *= 1.0 + sideAmount * 0.18; // Bulge outward at sides
            y -= sideAmount * 0.12; // Lower position (ear level)
        }

        // ===== STEP 4: CEREBELLUM (back-bottom bulge) =====
        // Add the cerebellum structure at the back
        if (z < -0.3 && y < -0.1) {
            const cerebellumFactor = Math.max(0, -(z + 0.3)) * Math.max(0, -(y + 0.1));
            x *= 1.0 + cerebellumFactor * 0.15; // Cerebellum width
            y -= cerebellumFactor * 0.12; // Lower position
            z -= cerebellumFactor * 0.08; // Push back
        }

        // Brain stem taper (narrower bottom)
        if (y < -0.5) {
            const bottomAmount = Math.abs(y + 0.5) / 0.5;
            x *= 1.0 - bottomAmount * 0.35; // Strong taper
            z *= 1.0 - bottomAmount * 0.25; // Strong taper
        }

        // ===== STEP 5: ULTRA-DETAILED GYRI AND SULCI =====
        // Create VERY PRONOUNCED brain folds (medical accuracy)

        // Primary gyri (large ridges)
        const gyrus1 = Math.sin(x * 15 + z * 12) * Math.cos(y * 14 + z * 3) * 0.055;
        const gyrus2 = Math.sin(x * 25 + y * 22) * Math.cos(z * 20 + x * 4) * 0.035;
        const gyrus3 = Math.sin(y * 35 + z * 30) * Math.cos(x * 32 + y * 2) * 0.022;

        // Secondary detail folds
        const gyrus4 = Math.sin(x * 45 + y * 40) * Math.cos(z * 42) * 0.015;
        const gyrus5 = Math.sin(z * 55 + x * 50) * Math.cos(y * 52) * 0.01;

        // Deep sulci (grooves between folds)
        const sulcus1 = Math.sin(x * 10 + z * 8) * Math.sin(y * 9) * -0.04;
        const sulcus2 = Math.sin(x * 18 + y * 15) * Math.sin(z * 16) * -0.025;

        // Tertiary micro-details
        const microDetail = Math.sin(x * 70) * Math.cos(y * 65) * Math.sin(z * 68) * 0.008;

        const totalFolds = gyrus1 + gyrus2 + gyrus3 + gyrus4 + gyrus5 + sulcus1 + sulcus2 + microDetail;

        // Apply all deformations
        const newLength = Math.sqrt(x * x + y * y + z * z);
        if (newLength > 0) {
            vertices[i] = x + (x / newLength) * totalFolds;
            vertices[i + 1] = y + (y / newLength) * totalFolds;
            vertices[i + 2] = z + (z / newLength) * totalFolds;
        }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    return geometry;
}

// Create neural pathways on brain surface
function createNeuralPathways() {
    const pathwayGroup = new THREE.Group();

    // Create multiple neural pathway lines
    for (let i = 0; i < 12; i++) {
        const points = [];
        const segments = 50;
        const radius = 1.56; // Slightly above brain surface

        // Create curved path along brain surface
        for (let j = 0; j <= segments; j++) {
            const t = j / segments;
            const theta = t * Math.PI * 2 + Math.random() * Math.PI;
            const phi = (Math.random() * 0.6 + 0.2) * Math.PI;

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi) + (Math.random() - 0.5) * 0.1;
            const z = radius * Math.sin(phi) * Math.sin(theta);

            points.push(new THREE.Vector3(x, y, z));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.008, 8, false);

        const glowMaterial = new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0x6fa99a : 0x708d7e,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });

        const pathway = new THREE.Mesh(tubeGeometry, glowMaterial);
        pathwayGroup.add(pathway);
    }

    brain.add(pathwayGroup);

    // Mark that brain has pathways for animation
    brain.userData.hasPathways = true;
}

// Create star field around brain (not inside)
function createBrainParticles() {
    const starCount = 800; // More stars for full screen effect
    const stars = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    // Star colors - white, blue-white, yellow-white
    const starColors = [
        new THREE.Color(0xffffff), // White
        new THREE.Color(0xf0f8ff), // Blue-white
        new THREE.Color(0xfffacd), // Yellow-white
        new THREE.Color(0xe6f2ff), // Cool white
    ];

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;

        // Create stars in a large sphere around the scene (not near brain center)
        let radius, x, y, z;
        let distanceFromCenter;

        do {
            // Random position in a large sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            radius = 3.5 + Math.random() * 8; // Far from brain (brain is at radius ~1.5-2)

            x = radius * Math.sin(phi) * Math.cos(theta);
            y = radius * Math.cos(phi);
            z = radius * Math.sin(phi) * Math.sin(theta);

            // Calculate distance from brain center
            distanceFromCenter = Math.sqrt(x * x + y * y + z * z);
        } while (distanceFromCenter < 3); // Ensure stars are outside brain area

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        // Random star color
        const selectedColor = starColors[Math.floor(Math.random() * starColors.length)];
        colors[i3] = selectedColor.r;
        colors[i3 + 1] = selectedColor.g;
        colors[i3 + 2] = selectedColor.b;

        // Varied star sizes (some bright, some dim)
        sizes[i] = Math.random() * 3 + 0.5;
    }

    stars.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    stars.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    stars.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create star texture for point shape
    const starTexture = createStarTexture();

    const starMaterial = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        map: starTexture,
        depthWrite: false
    });

    const starSystem = new THREE.Points(stars, starMaterial);
    scene.add(starSystem);

    // Store reference for animation (twinkling effect)
    brain.userData.particles = starSystem;
}

// Create star-shaped texture for particles
function createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Create star shape with glow
    const centerX = 32;
    const centerY = 32;

    // Outer glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    // Add cross shape for star sparkle effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    // Horizontal line
    ctx.fillRect(0, 30, 64, 4);
    // Vertical line
    ctx.fillRect(30, 0, 4, 64);
    // Diagonal lines
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-32, -2, 64, 4);
    ctx.fillRect(-2, -32, 4, 64);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Interior 360° scene
function initInteriorScene() {
    const canvas = document.getElementById('interior-canvas');

    // Check if canvas exists, if not, skip initialization
    if (!canvas) {
        console.log('Interior canvas not found - skipping interior scene initialization');
        return;
    }

    interiorScene = new THREE.Scene();
    interiorCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    interiorRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    interiorRenderer.setSize(window.innerWidth, window.innerHeight);

    // Create interior brain environment
    createInteriorEnvironment();

    interiorCamera.position.set(0, 0, 0);
}

function createInteriorEnvironment() {
    // Create a large sphere for the interior environment
    const geometry = new THREE.SphereGeometry(50, 64, 64);

    // Create a neural network texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Draw neural network pattern
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw neural connections
    ctx.strokeStyle = '#6fa99a';
    ctx.lineWidth = 1;

    for (let i = 0; i < 200; i++) {
        const x1 = Math.random() * canvas.width;
        const y1 = Math.random() * canvas.height;
        const x2 = x1 + (Math.random() - 0.5) * 200;
        const y2 = y1 + (Math.random() - 0.5) * 200;

        ctx.globalAlpha = Math.random() * 0.5 + 0.1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // Draw neurons
    ctx.fillStyle = '#6fa99a';
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 3 + 1;

        ctx.globalAlpha = Math.random() * 0.8 + 0.2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.7
    });

    const interiorSphere = new THREE.Mesh(geometry, material);
    interiorScene.add(interiorSphere);

    // Add floating particles
    createFloatingParticles();
}

function createFloatingParticles() {
    const particleCount = 1000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 100;
        positions[i + 1] = (Math.random() - 0.5) * 100;
        positions[i + 2] = (Math.random() - 0.5) * 100;

        colors[i] = Math.random();
        colors[i + 1] = Math.random();
        colors[i + 2] = 1;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    interiorScene.add(particleSystem);
}

// Neural network animation for section 5
function initNeuralAnimation() {
    neuralCanvas = document.getElementById('neural-canvas');
    if (!neuralCanvas) return;

    neuralCtx = neuralCanvas.getContext('2d');

    // Set canvas size
    function resizeNeuralCanvas() {
        const rect = neuralCanvas.getBoundingClientRect();
        neuralCanvas.width = rect.width;
        neuralCanvas.height = rect.height;
    }

    resizeNeuralCanvas();
    window.addEventListener('resize', resizeNeuralCanvas);

    // Neural network animation
    const neurons = [];
    const connections = [];

    // Create neurons
    for (let i = 0; i < 50; i++) {
        neurons.push({
            x: Math.random() * neuralCanvas.width,
            y: Math.random() * neuralCanvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 3 + 2,
            color: `hsl(${Math.random() * 60 + 180}, 70%, 60%)`
        });
    }

    function animateNeuralNetwork() {
        neuralCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        neuralCtx.fillRect(0, 0, neuralCanvas.width, neuralCanvas.height);

        // Update and draw neurons
        neurons.forEach((neuron, i) => {
            neuron.x += neuron.vx;
            neuron.y += neuron.vy;

            // Bounce off edges
            if (neuron.x < 0 || neuron.x > neuralCanvas.width) neuron.vx *= -1;
            if (neuron.y < 0 || neuron.y > neuralCanvas.height) neuron.vy *= -1;

            // Draw neuron
            neuralCtx.beginPath();
            neuralCtx.arc(neuron.x, neuron.y, neuron.radius, 0, Math.PI * 2);
            neuralCtx.fillStyle = neuron.color;
            neuralCtx.fill();

            // Draw connections to nearby neurons
            neurons.forEach((otherNeuron, j) => {
                if (i !== j) {
                    const dx = neuron.x - otherNeuron.x;
                    const dy = neuron.y - otherNeuron.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 100) {
                        neuralCtx.beginPath();
                        neuralCtx.moveTo(neuron.x, neuron.y);
                        neuralCtx.lineTo(otherNeuron.x, otherNeuron.y);
                        neuralCtx.strokeStyle = `rgba(111, 169, 154, ${1 - distance / 100})`;
                        neuralCtx.lineWidth = 1;
                        neuralCtx.stroke();
                    }
                }
            });
        });

        requestAnimationFrame(animateNeuralNetwork);
    }

    animateNeuralNetwork();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (!isLoaded) return;

    const time = Date.now() * 0.001;

    // Animate brain in section 1
    if (brain && currentSection === 1) {
        // Slow rotation
        brain.rotation.y += 0.005;

        // Very subtle pulsing animation for neural activity (only for fallback brain)
        if (brain.userData.hasPathways) {
            const pulse = Math.sin(time * 1.5) * 0.008 + 1;
            brain.scale.setScalar(pulse);
        }

        // Animate neural pathways (glow effect) - only if they exist
        if (brain.userData.hasPathways && brain.children.length > 0) {
            const pathwayGroup = brain.children.find(child => child.isGroup);
            if (pathwayGroup && pathwayGroup.children) {
                pathwayGroup.children.forEach((pathway, index) => {
                    if (pathway.material && pathway.material.opacity !== undefined) {
                        const opacity = 0.4 + Math.sin(time * 3 + index * 0.5) * 0.3;
                        pathway.material.opacity = opacity;
                    }
                });
            }
        }

        // Animate MAGICAL neural veins extending outward
        if (brain.userData.hasVeins && brain.userData.veinGroup) {
            brain.userData.veinGroup.children.forEach((vein, index) => {
                if (vein.material && vein.material.uniforms) {
                    // Update time uniform for pulsing glow effect
                    vein.material.uniforms.time.value = time * 2 + index * 0.3;

                    // Optional: slight rotation for mystical effect
                    vein.rotation.y = Math.sin(time * 0.5 + index) * 0.02;
                }
            });
        }

        // Animate stars (twinkling effect + mouse interaction)
        if (brain.userData.particles) {
            const positions = brain.userData.particles.geometry.attributes.position.array;
            const sizes = brain.userData.particles.geometry.attributes.size.array;
            const colors = brain.userData.particles.geometry.attributes.color.array;
            const material = brain.userData.particles.material;

            // Calculate mouse position in 3D world space
            raycaster.setFromCamera(mouse, camera);
            const distance = 10;
            mouseWorldPos.copy(raycaster.ray.direction).multiplyScalar(distance).add(raycaster.ray.origin);

            // Store original positions if not stored
            if (!brain.userData.particleOriginalPositions) {
                brain.userData.particleOriginalPositions = new Float32Array(positions.length);
                for (let i = 0; i < positions.length; i++) {
                    brain.userData.particleOriginalPositions[i] = positions[i];
                }
            }

            const originalPositions = brain.userData.particleOriginalPositions;

            // Twinkle effect + mouse interaction
            for (let i = 0; i < sizes.length; i++) {
                const i3 = i * 3;
                const x = positions[i3];
                const y = positions[i3 + 1];
                const z = positions[i3 + 2];

                // Calculate distance from mouse in 3D
                const dx = x - mouseWorldPos.x;
                const dy = y - mouseWorldPos.y;
                const dz = z - mouseWorldPos.z;
                const distToMouse = Math.sqrt(dx * dx + dy * dy + dz * dz);

                // Mouse repulsion effect (stars move away from mouse)
                const repulsionRadius = 3.5;
                if (distToMouse < repulsionRadius) {
                    const repulsionForce = (1 - distToMouse / repulsionRadius) * 0.5;
                    positions[i3] += (dx / distToMouse) * repulsionForce;
                    positions[i3 + 1] += (dy / distToMouse) * repulsionForce;
                    positions[i3 + 2] += (dz / distToMouse) * repulsionForce;

                    // Stars near mouse get brighter
                    const brightnessFactor = 1 + repulsionForce * 2;
                    colors[i3] = Math.min(1, colors[i3] * brightnessFactor);
                    colors[i3 + 1] = Math.min(1, colors[i3 + 1] * brightnessFactor);
                    colors[i3 + 2] = Math.min(1, colors[i3 + 2] * brightnessFactor);
                } else {
                    // Gradually return to original position
                    const returnSpeed = 0.05;
                    positions[i3] += (originalPositions[i3] - positions[i3]) * returnSpeed;
                    positions[i3 + 1] += (originalPositions[i3 + 1] - positions[i3 + 1]) * returnSpeed;
                    positions[i3 + 2] += (originalPositions[i3 + 2] - positions[i3 + 2]) * returnSpeed;

                    // Return to original color
                    const starColors = [
                        { r: 1, g: 1, b: 1 },
                        { r: 0.941, g: 0.973, b: 1 },
                        { r: 1, g: 0.980, b: 0.804 },
                        { r: 0.902, g: 0.949, b: 1 }
                    ];
                    const targetColor = starColors[i % 4];
                    colors[i3] += (targetColor.r - colors[i3]) * 0.05;
                    colors[i3 + 1] += (targetColor.g - colors[i3 + 1]) * 0.05;
                    colors[i3 + 2] += (targetColor.b - colors[i3 + 2]) * 0.05;
                }

                // Create twinkling by varying size and using unique offset per star
                const twinkleSpeed = 0.5 + (i % 10) * 0.3;
                const twinkleOffset = i * 0.628;
                const twinkle = Math.sin(time * twinkleSpeed + twinkleOffset) * 0.5 + 0.5;
                
                // Some stars twinkle more dramatically than others
                const baseSize = 0.5 + (i % 5) * 0.3;
                sizes[i] = baseSize + twinkle * 1.5;

                // Stars near mouse get bigger
                if (distToMouse < repulsionRadius) {
                    const sizeFactor = 1 + (1 - distToMouse / repulsionRadius) * 1.5;
                    sizes[i] *= sizeFactor;
                }
            }

            brain.userData.particles.geometry.attributes.position.needsUpdate = true;
            brain.userData.particles.geometry.attributes.size.needsUpdate = true;
            brain.userData.particles.geometry.attributes.color.needsUpdate = true;

            // Subtle overall opacity fade for atmospheric effect
            const atmosphericPulse = Math.sin(time * 0.3) * 0.1 + 0.85;
            material.opacity = atmosphericPulse;
        }
    }

    // Render main scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }

    // Render interior scene with rotation
    if (interiorRenderer && interiorScene && interiorCamera && currentSection >= 2) {
        interiorCamera.rotation.y += 0.001;
        interiorCamera.rotation.x = Math.sin(Date.now() * 0.0005) * 0.1;
        interiorRenderer.render(interiorScene, interiorCamera);
    }
}

// GSAP ScrollTrigger animations
function initScrollAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // Section 1 to Section 2 transition
    gsap.timeline({
        scrollTrigger: {
            trigger: "#section-2",
            start: "top bottom",
            end: "top top",
            scrub: 1,
            onUpdate: (self) => {
                const progress = self.progress;

                // Scale the brain (opacity disabled - user controls it)
                if (brain) {
                    // Get base scale based on device
                    let baseScale = 1;
                    if (isMobile) {
                        baseScale = 0.7;
                    } else if (isTablet) {
                        baseScale = 0.85;
                    }
                    
                    // Apply scroll scale on top of device scale
                    brain.scale.setScalar(baseScale * (1 + progress * 2));

                    // OPACITY ANIMATION DISABLED - User sets opacity manually
                    // Keeping brain opacity constant as set by user
                }

                // Camera zoom - adjust for device
                if (camera) {
                    let baseCameraZ = 5;
                    if (isMobile) {
                        baseCameraZ = 7;
                    } else if (isTablet) {
                        baseCameraZ = 6;
                    }
                    camera.position.z = baseCameraZ - progress * 4;
                }

                // Magical text shrinks and moves down (going into brain)
                const magicalTitle = document.getElementById('magical-title');
                if (magicalTitle) {
                    // Start at full size (2vw fits on one line), shrink to 0.8vw (very tiny)
                    const startSize = 2;
                    const endSize = 0.8;
                    const currentSize = startSize - (progress * (startSize - endSize));

                    magicalTitle.style.fontSize = `${currentSize}vw`;
                    magicalTitle.style.opacity = 1 - (progress * 0.85); // Fade to 15% opacity

                    // Move text DOWN as it shrinks (going into brain effect)
                    const moveDown = progress * 300; // Move 300px down
                    magicalTitle.style.transform = `translateY(${moveDown}px)`;

                    // Compress letter spacing (going into brain effect)
                    const startSpacing = 0.02;
                    const endSpacing = -0.03;
                    const currentSpacing = startSpacing - (progress * (startSpacing - endSpacing));
                    magicalTitle.style.letterSpacing = `${currentSpacing}em`;
                }
            }
        }
    });

    // Content sections animations
    gsap.utils.toArray('.content-card').forEach((card, i) => {
        gsap.fromTo(card,
            {
                y: 100,
                opacity: 0,
                scale: 0.8
            },
            {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 1,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: card,
                    start: "top 80%",
                    end: "bottom 20%",
                    toggleActions: "play none none reverse"
                }
            }
        );
    });

    // Stats animation
    gsap.utils.toArray('.stat-number').forEach((stat) => {
        const finalValue = stat.textContent;
        gsap.fromTo(stat,
            { textContent: 0 },
            {
                textContent: finalValue,
                duration: 2,
                ease: "power2.out",
                snap: { textContent: 1 },
                scrollTrigger: {
                    trigger: stat,
                    start: "top 80%"
                }
            }
        );
    });

    // Doctor image animation
    if (document.querySelector('.doctor-image')) {
        gsap.fromTo('.doctor-image',
            {
                scale: 0,
                rotation: -180
            },
            {
                scale: 1,
                rotation: 0,
                duration: 1.5,
                ease: "back.out(1.7)",
                scrollTrigger: {
                    trigger: '.doctor-image',
                    start: "top 80%"
                }
            }
        );
    }

    // Conference content animations
    if (document.querySelector('.brain-interior')) {
        const timeline = gsap.timeline({
            scrollTrigger: {
                trigger: ".brain-interior",
                start: "top 80%",
                end: "bottom 20%",
                toggleActions: "play none none reverse"
            }
        });

        if (document.querySelector('.conference-badge')) {
            timeline.fromTo('.conference-badge', { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 });
        }
        if (document.querySelector('.conference-title .location')) {
            timeline.fromTo('.conference-title .location', { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, "-=0.4");
        }
        if (document.querySelector('.conference-title .event-type')) {
            timeline.fromTo('.conference-title .event-type', { x: 50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, "-=0.3");
        }
        if (document.querySelector('.conference-title .event-name')) {
            timeline.fromTo('.conference-title .event-name', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.2");
        }
        if (document.querySelector('.date-display')) {
            timeline.fromTo('.date-display', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6 }, "-=0.2");
        }
        if (document.querySelector('.countdown-container')) {
            timeline.fromTo('.countdown-container', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.3");
        }
        if (document.querySelector('.stat-item')) {
            timeline.fromTo('.stat-item', { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.4 }, "-=0.2");
        }
    }

    // Chairman section animations
    if (document.querySelector('.chairman-image')) {
        gsap.fromTo('.chairman-image',
            {
                x: -100,
                opacity: 0,
                rotation: -10
            },
            {
                x: 0,
                opacity: 1,
                rotation: 0,
                duration: 1.2,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: '.chairman-section',
                    start: "top 70%"
                }
            }
        );
    }

    if (document.querySelector('.chairman-info')) {
        gsap.fromTo('.chairman-info',
            {
                x: 100,
                opacity: 0
            },
            {
                x: 0,
                opacity: 1,
                duration: 1.2,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: '.chairman-section',
                    start: "top 70%"
                }
            }
        );
    }

    // Audience section animations
    if (document.querySelector('.circular-diagram')) {
        gsap.fromTo('.circular-diagram',
            {
                scale: 0,
                rotation: -180
            },
            {
                scale: 1,
                rotation: 0,
                duration: 1.5,
                ease: "back.out(1.7)",
                scrollTrigger: {
                    trigger: '.audience-section',
                    start: "top 70%"
                }
            }
        );
    }

    if (document.querySelector('.audience-item')) {
        gsap.fromTo('.audience-item',
            {
                scale: 0,
                opacity: 0
            },
            {
                scale: 1,
                opacity: 1,
                duration: 0.8,
                ease: "back.out(1.7)",
                stagger: 0.2,
                scrollTrigger: {
                    trigger: '.audience-section',
                    start: "top 60%"
                }
            }
        );
    }

    if (document.querySelector('.audience-column li')) {
        gsap.fromTo('.audience-column li',
            {
                x: -50,
                opacity: 0
            },
            {
                x: 0,
                opacity: 1,
                duration: 0.6,
                ease: "power2.out",
                stagger: 0.1,
                scrollTrigger: {
                    trigger: '.audience-content',
                    start: "top 70%"
                }
            }
        );
    }

    // Objectives section animations
    if (document.querySelector('.objective-item')) {
        gsap.fromTo('.objective-item',
            {
                x: -100,
                opacity: 0
            },
            {
                x: 0,
                opacity: 1,
                duration: 0.8,
                ease: "power2.out",
                stagger: 0.2,
                scrollTrigger: {
                    trigger: '.objectives-section',
                    start: "top 70%"
                }
            }
        );
    }

    if (document.querySelector('.brain-scan-container')) {
        gsap.fromTo('.brain-scan-container',
            {
                scale: 0.5,
                opacity: 0,
                rotation: 10
            },
            {
                scale: 1,
                opacity: 1,
                rotation: 0,
                duration: 1.2,
                ease: "back.out(1.7)",
                scrollTrigger: {
                    trigger: '.objectives-section',
                    start: "top 60%"
                }
            }
        );
    }

    // Sponsors section animations
    if (document.querySelector('.sponsors-container h2')) {
        gsap.fromTo('.sponsors-container h2',
            {
                y: -50,
                opacity: 0
            },
            {
                y: 0,
                opacity: 1,
                duration: 1,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: '.sponsors-section',
                    start: "top 80%"
                }
            }
        );
    }

    if (document.querySelector('.sponsor-logo')) {
        gsap.fromTo('.sponsor-logo',
            {
                y: 50,
                opacity: 0,
                scale: 0.8
            },
            {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 0.8,
                ease: "back.out(1.7)",
                stagger: 0.2,
                scrollTrigger: {
                    trigger: '.sponsors-section',
                    start: "top 70%"
                }
            }
        );
    }
}

// Event listeners
function initEventListeners() {
    // Mobile menu toggle functionality
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navLinkItems = document.querySelectorAll('.nav-links a');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });

        // Close menu when clicking on a link
        navLinkItems.forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
    }

    // Smooth scroll for navigation links
    navLinkItems.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetSection = document.getElementById(targetId);

                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Mouse movement for brain rotation
    document.addEventListener('mousemove', (event) => {
        if (!isLoaded || !brain) return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Only rotate in section 1
        if (currentSection === 1) {
            // Adjust rotation sensitivity based on device
            let rotationMultiplier = 0.3;
            if (isMobile) {
                rotationMultiplier = 0.15; // Less sensitive on mobile
            } else if (isTablet) {
                rotationMultiplier = 0.22; // Medium sensitivity on tablet
            }
            
            gsap.to(brain.rotation, {
                duration: 2,
                x: mouse.y * rotationMultiplier,
                y: mouse.x * rotationMultiplier,
                ease: "power2.out"
            });
        }
    });

    // Navigation scroll effect
    const mainNav = document.querySelector('.main-nav');
    if (mainNav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                mainNav.classList.add('nav-scroll');
            } else {
                mainNav.classList.remove('nav-scroll');
            }
        });
    }

    // Scroll detection for current section
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        currentSection = Math.floor(scrollY / windowHeight) + 1;

        // Update navigation active state
        updateActiveNavigation();
    });

    // Window resize
    window.addEventListener('resize', () => {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Update brain scale and camera for device
            updateCameraForDevice();
        }

        if (interiorCamera && interiorRenderer) {
            interiorCamera.aspect = window.innerWidth / window.innerHeight;
            interiorCamera.updateProjectionMatrix();
            interiorRenderer.setSize(window.innerWidth, window.innerHeight);
        }
    });
}

// Countdown Timer Functionality
function initCountdownTimer() {
    // Set the conference date (January 9, 2026)
    const conferenceDate = new Date('2026-01-09T09:00:00').getTime();

    function updateCountdown() {
        const now = new Date().getTime();
        const timeLeft = conferenceDate - now;

        if (timeLeft > 0) {
            // Calculate time units
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            // Update DOM elements
            const daysEl = document.getElementById('days');
            const hoursEl = document.getElementById('hours');
            const minutesEl = document.getElementById('minutes');
            const secondsEl = document.getElementById('seconds');

            // Smart formatting: 3 digits if >= 100, 2 digits if < 100
            if (daysEl) daysEl.textContent = days >= 100 ? days.toString().padStart(3, '0') : days.toString().padStart(2, '0');
            if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
            if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
            if (secondsEl) {
                // Add pulse animation when seconds change
                const oldSeconds = secondsEl.textContent;
                const newSeconds = seconds.toString().padStart(2, '0');

                if (oldSeconds !== newSeconds) {
                    secondsEl.parentElement.classList.add('pulse');
                    setTimeout(() => {
                        secondsEl.parentElement.classList.remove('pulse');
                    }, 500);
                }

                secondsEl.textContent = newSeconds;
            }
        } else {
            // Conference has started
            const daysEl = document.getElementById('days');
            const hoursEl = document.getElementById('hours');
            const minutesEl = document.getElementById('minutes');
            const secondsEl = document.getElementById('seconds');

            if (daysEl) daysEl.textContent = '00';
            if (hoursEl) hoursEl.textContent = '00';
            if (minutesEl) minutesEl.textContent = '00';
            if (secondsEl) secondsEl.textContent = '00';

            // Update countdown title
            const titleEl = document.querySelector('.countdown-title');
            if (titleEl) {
                titleEl.textContent = 'Conference is Live!';
                titleEl.style.color = '#6fa99a';
            }
        }
    }

    // Update countdown immediately and then every second
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // Add hover effects to time units
    document.querySelectorAll('.time-unit').forEach(unit => {
        unit.addEventListener('mouseenter', () => {
            gsap.to(unit, {
                duration: 0.3,
                scale: 1.05,
                ease: "power2.out"
            });
        });

        unit.addEventListener('mouseleave', () => {
            gsap.to(unit, {
                duration: 0.3,
                scale: 1,
                ease: "power2.out"
            });
        });
    });
}

// Utility functions
function updateActiveNavigation() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');

    let currentActiveSection = '';

    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
            currentActiveSection = section.id;
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentActiveSection}`) {
            link.classList.add('active');
        }
    });
}
