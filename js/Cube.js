class Cube {
    constructor(scene) {
        this.scene = scene;
        this.cube = new THREE.Group();
        this.isRotating = false;
        this.selectedCubelet = null;
        this.lastDirection = '';
        
        // 魔方参数
        this.cubeletSize = 1.8;
        this.gap = 0.2;
        this.spacing = this.cubeletSize + this.gap;
        
        this.initMaterials();
        this.createCube();
    }

    initMaterials() {
        // 创建魔方的材质
        this.materials = [
            new THREE.MeshPhongMaterial({ color: 0xff0000, shininess: 100 }), // 红
            new THREE.MeshPhongMaterial({ color: 0x00ff00, shininess: 100 }), // 绿
            new THREE.MeshPhongMaterial({ color: 0x0000ff, shininess: 100 }), // 蓝
            new THREE.MeshPhongMaterial({ color: 0xffff00, shininess: 100 }), // 黄
            new THREE.MeshPhongMaterial({ color: 0xffa500, shininess: 100 }), // 橙
            new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 })  // 白
        ];

        // 创建灰色材质（用于内部面）
        this.grayMaterial = new THREE.MeshPhongMaterial({
            color: 0x808080,
            shininess: 0
        });
    }

    createCubelet(x, y, z) {
        const geometry = new THREE.BoxGeometry(this.cubeletSize, this.cubeletSize, this.cubeletSize);

        const cubeMaterials = [
            x === 1 ? this.materials[4] : this.grayMaterial,  // 右面 - 橙
            x === -1 ? this.materials[0] : this.grayMaterial, // 左面 - 红
            y === 1 ? this.materials[5] : this.grayMaterial,  // 顶面 - 白
            y === -1 ? this.materials[3] : this.grayMaterial, // 底面 - 黄
            z === 1 ? this.materials[1] : this.grayMaterial,  // 前面 - 绿
            z === -1 ? this.materials[2] : this.grayMaterial  // 后面 - 蓝
        ];

        const cubelet = new THREE.Mesh(geometry, cubeMaterials);
        cubelet.position.set(x * this.spacing, y * this.spacing, z * this.spacing);
        cubelet.castShadow = true;
        return cubelet;
    }

    createCube() {
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const cubelet = this.createCubelet(x, y, z);
                    this.cube.add(cubelet);
                }
            }
        }
        this.scene.add(this.cube);
    }

    handlePointerDown(event, camera, controls) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(this.cube.children);
        if (intersects.length > 0) {
            controls.enabled = false;
            this.selectedCubelet = intersects[0].object;
            this.startX = event.clientX;
            this.startY = event.clientY;
            this.lastDirection = '';
            console.log('选中了一个小方块');
        } else {
            this.selectedCubelet = null;
        }
    }

    handlePointerMove(event, camera, controls) {
        if (this.selectedCubelet && !this.lastDirection && !this.isRotating) {
            const deltaX = event.clientX - this.startX;
            const deltaY = event.clientY - this.startY;
            const threshold = 10;

            if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    this.lastDirection = deltaX > 0 ? '向右' : '向左';
                    this.rotateLayer(this.selectedCubelet, 'horizontal', this.lastDirection === '向右' ? 1 : -1);
                } else {
                    this.lastDirection = deltaY > 0 ? '向下' : '向上';
                    this.rotateLayer(this.selectedCubelet, 'vertical', this.lastDirection === '向下' ? 1 : -1);
                }
                console.log('滑动方向:', this.lastDirection);
            }
        }
    }

    handlePointerUp(controls) {
        controls.enabled = true;
        this.selectedCubelet = null;
    }

    rotateLayer(selectedCubelet, direction, rotationDirection) {
        this.isRotating = true;

        let rotationAxis, rotationAngle;
        if (direction === 'horizontal') {
            rotationAxis = new THREE.Vector3(0, 1, 0);
            rotationAngle = Math.PI / 2 * rotationDirection;
        } else {
            const cameraDirection = camera.position.clone().sub(this.cube.getWorldPosition(new THREE.Vector3())).normalize();
            const { x: dirX, z: dirZ } = cameraDirection;
            const isMainlyX = Math.abs(dirX) > Math.abs(dirZ);
            rotationAxis = isMainlyX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
            rotationAngle = Math.PI / 2 * rotationDirection * (isMainlyX ? -Math.sign(dirX) : Math.sign(dirZ));
        }

        const sameAxisCubelets = this.cube.children.filter(cubelet => {
            const projection = cubelet.getWorldPosition(new THREE.Vector3()).dot(rotationAxis);
            const selectedProjection = selectedCubelet.getWorldPosition(new THREE.Vector3()).dot(rotationAxis);
            return Math.abs(projection - selectedProjection) < 0.1;
        });

        const rotationGroup = new THREE.Group();
        sameAxisCubelets.forEach(cubelet => {
            const worldPosition = cubelet.getWorldPosition(new THREE.Vector3());
            const worldQuaternion = cubelet.getWorldQuaternion(new THREE.Quaternion());

            this.cube.remove(cubelet);
            rotationGroup.add(cubelet);

            cubelet.position.copy(worldPosition);
            cubelet.quaternion.copy(worldQuaternion);
        });

        this.scene.add(rotationGroup);

        const start = { angle: 0 };
        const end = { angle: rotationAngle };
        let previousAngle = 0;
        const cubeletsInGroup = [...rotationGroup.children];

        new TWEEN.Tween(start)
            .to(end, 300)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                const deltaAngle = start.angle - previousAngle;
                rotationGroup.rotateOnWorldAxis(rotationAxis, deltaAngle);
                previousAngle = start.angle;
            })
            .onComplete(() => {
                cubeletsInGroup.forEach(cubelet => {
                    const worldPosition = cubelet.getWorldPosition(new THREE.Vector3());
                    const worldQuaternion = cubelet.getWorldQuaternion(new THREE.Quaternion());

                    rotationGroup.remove(cubelet);
                    this.cube.add(cubelet);

                    const localPosition = new THREE.Vector3();
                    const localQuaternion = new THREE.Quaternion();

                    const cubeWorldMatrixInverse = new THREE.Matrix4();
                    cubeWorldMatrixInverse.copy(this.cube.matrixWorld).invert();

                    localPosition.copy(worldPosition).applyMatrix4(cubeWorldMatrixInverse);
                    localQuaternion.copy(worldQuaternion).premultiply(this.cube.quaternion.clone().invert());

                    cubelet.position.copy(localPosition);
                    cubelet.quaternion.copy(localQuaternion);
                });

                this.scene.remove(rotationGroup);
                this.lastDirection = '';
                this.isRotating = false;
            })
            .start();
    }

    rotateCube(key, camera) {
        if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'w' || key === 's') {
            this.isRotating = true;
            const rotationDirection = key === 'ArrowUp' || key === 'w' ? -1 : 1;
            const cameraDirection = camera.position.clone().sub(this.cube.position).normalize();
            const { x: dirX, z: dirZ } = cameraDirection;
            const isMainlyX = Math.abs(dirX) > Math.abs(dirZ);
            const rotationAxis = isMainlyX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
            const rotationAngle = Math.PI / 2 * rotationDirection * (isMainlyX ? -Math.sign(dirX) : Math.sign(dirZ));

            this.animateRotation(rotationAxis, rotationAngle);
        }

        if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'a' || key === 'd') {
            this.isRotating = true;
            const rotationDirection = key === 'ArrowLeft' || key === 'a' ? -1 : 1;
            const rotationAxis = new THREE.Vector3(0, 1, 0);
            const rotationAngle = Math.PI / 2 * rotationDirection;
            this.animateRotation(rotationAxis, rotationAngle);
        }
    }

    animateRotation(rotationAxis, rotationAngle) {
        rotationAxis.normalize();
        const start = { angle: 0 };
        const end = { angle: rotationAngle };
        let previousAngle = 0;
        new TWEEN.Tween(start)
            .to(end, 300)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(() => {
                const deltaAngle = start.angle - previousAngle;
                this.cube.rotateOnWorldAxis(rotationAxis, deltaAngle);
                previousAngle = start.angle;
            })
            .onComplete(() => {
                this.isRotating = false;
            })
            .start();
    }

    scramble(moves = 20) {
        if (this.isRotating) return;

        const allMoves = [
            { type: 'layer', direction: 'vertical', value: 1 },
            { type: 'layer', direction: 'vertical', value: -1 },
            { type: 'layer', direction: 'horizontal', value: 1 },
            { type: 'layer', direction: 'horizontal', value: -1 },
        ];

        let moveCount = 0;

        const makeNextMove = () => {
            if (moveCount >= moves) return;
            
            if (!this.isRotating) {
                const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];

                if (randomMove.type === 'layer') {
                    let selectedCube;
                    let isCenter = false;
                    do {
                        selectedCube = this.cube.children[Math.floor(Math.random() * this.cube.children.length)];
                        const pos = selectedCube.getWorldPosition(new THREE.Vector3());
                        isCenter = [Math.abs(pos.x), Math.abs(pos.y), Math.abs(pos.z)].filter(coord => Math.abs(coord) < 0.1).length >= 2;
                    } while (isCenter);

                    this.rotateLayer(selectedCube, randomMove.direction, randomMove.value);
                }
                moveCount++;
                setTimeout(makeNextMove, 350);
            }
        };

        makeNextMove();
    }
} 