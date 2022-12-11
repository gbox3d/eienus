import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { TGALoader } from 'three/addons/loaders/TGALoader.js';

import { comFileFindFile, comFileDownload, comFileUpload, textDataUpload, makeFileObj } from "../comLibs/utils.js";
import elvisObjLoader from './elvisObjLoader.js';

import { dummyObject, gameObject } from './gameObject.js';

// const defaultMaterial = new THREE.MeshStandardMaterial({
//     color: 0xffffff,
//     metalness: 0.5,
//     roughness: 0.5,
// });


export default async function ({ scope }) {

    const mEntityRepository = {}
    const mTextureRepository = {}
    const mMaterialRepository = {}
    const mSceneMng = scope;

    // const mDefaultTexture = new THREE.TextureLoader().load('https://threejsfundamentals.org/threejs/resources/images/checker.png');
    const mDefaultStandardMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.5,
        roughness: 0.5,
        // map: mDefaultTexture
    });

    const mDefaultWireframeMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        wireframe: true
    });


    function clearAllRepository() {

        for (const key in mTextureRepository) {
            mTextureRepository[key]?.dispose();
            mTextureRepository[key] = null;
        }

        for (const key in mEntityRepository) {
            mEntityRepository[key]?.geometry?.dispose();
            mEntityRepository[key] = null;
        }

        for (const key in mMaterialRepository) {
            // mMaterialRepository[key]?.dispose();
            mMaterialRepository[key] = null;
        }

        // mEntityRepository = {}
        // mTextureRepository = {}
        // mMaterialRepository = {}
    }



    //확장함수
    const loadFbx = async function ({ fileID, onProgress, repo_ip }) {
        if (!mEntityRepository[fileID]) {
            const loader = new FBXLoader();
            try {
                let object = await new Promise((resolve, reject) => {
                    // loader.load(`/com/file/download/pub/6282fc15be7f388aab7750db`,
                    loader.load(`${repo_ip ? repo_ip : ''}/com/file/download/pub/${fileID}`,
                        (object) => resolve(object),
                        (xhr) => { //progress
                            // console.log(xhr)
                            // console.log(`${(xhr.loaded / xhr.total * 100)}% loaded`);
                            onProgress ? onProgress({
                                name: `load fbx ${fileID}`,
                                progress: (xhr.loaded / xhr.total * 100)
                            }) : null;
                        },
                        (err) => {
                            reject(err);
                        }
                    );
                });

                object.traverse((child) => {
                    if (child.isMesh) {
                        child.material = mDefaultWireframeMaterial;
                    }
                });

                // // if (material) {
                // //     object.traverse((child) => {
                // //         if (child.isMesh) {
                // //             child.material = material;
                // //         }
                // //     });
                // // }
                // // else {
                // //     //메트리얼 텍스춰 모두 지정안되어있을때
                // //     object.traverse((child) => {
                // //         if (child.isMesh) {
                // //             child.material = scope.defaultMaterial;
                // //         }
                // //     });
                // // }

                // //fbx 파일로 만든 오브잭트는 바로 프펩이된다
                // // object.userData.isPrefabRoot = true;
                // object.userData.geometryFile = {
                //     modelFile: modelFile,
                //     repo_ip: repo_ip,
                //     format: 'fbx'
                // }

                mEntityRepository[fileID] = object;
            }
            catch (err) {
                console.log(err)
                return null;

            }
        }

        return mEntityRepository[fileID].clone();
    }

    const saveGlf = async function ({ entity, name, repo_ip }) {

        const exporter = new GLTFExporter();

        const options = {
            trs: true,
            onlyVisible: true,
            truncateDrawRange: true,
            binary: true,
            forceIndices: true,
            forcePowerOfTwoTextures: false,
            maxTextureSize: Infinity
        };

        const _output = await new Promise((resolve, reject) => {
            exporter.parse(entity, resolve,
                (err) => {
                    console.log(err);
                    reject(err);
                }, options);
        });

        let fileObj = {
            file: {
                name: `${entity.name}.glb`,
                size: _output.byteLength,
                type: 'application/gltf-buffer',
            },
            data: _output
        }

        let hash = md5(fileObj.data)
        console.log(hash);
        // console.log(form_data);

        const res = await comFileUpload({
            fileObj: fileObj,
            fileType: 'application/gltf-buffer',
            title: entity.name,
            description: '',
            directory: 'model',
            isPublic: true,
            md5: hash
        });

        return res;

    }


    const loadGlf = async function ({ fileID, onProgress, repo_ip }) {
        if (!mEntityRepository[fileID]) {
            const loader = new GLTFLoader();
            try {
                let glf = await new Promise((resolve, reject) => {

                    loader.load(`${repo_ip ? repo_ip : ''}/com/file/download/pub/${fileID}`,
                        (glf) => resolve(glf),
                        (xhr) => { //progress   
                            onProgress ? onProgress({
                                name: `loadGlf ${fileID}`,
                                progress: (xhr.loaded / xhr.total * 100)
                            }) : null;
                        }

                    );
                });
                console.log(glf);
                mEntityRepository[fileID] = glf.scene;

            }
            catch (err) {
                console.log(err)
            }
        }

        return mEntityRepository[fileID].clone();
    }

    const loadTexture = async function ({ textureFile, onProgress, repo_ip, type }) {

        if (!mTextureRepository[textureFile]) {

            // mTextureRepository[textureFile] = {};

            console.log(`load texture ${textureFile} ,${type}`);

            let loader = new THREE.TextureLoader();

            if (type == 'application/exr') {
                loader = new EXRLoader();
            }
            else if (type == 'application/hdr' || type == 'image/pict') {
                loader = new RGBELoader();
            }
            else if(type == 'image/targa'){
                loader = new TGALoader();
            }
            else {
                loader = new THREE.TextureLoader();
            }

            const texture = await new Promise((resolve, reject) => {
                loader.load(`${repo_ip ? repo_ip : ''}/com/file/download/pub/${textureFile}`, function (texture) {
                    resolve(texture);
                },
                    function (xhr) {
                        // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                        onProgress ? onProgress({
                            name: textureFile,
                            progress: (xhr.loaded / xhr.total * 100)
                        }) : null;
                        //loadingStatus.innerText = `radios hdr enviroment map : ${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded`;
                    }
                    ,
                    err => {
                        console.log(err);
                        return reject(err);
                    }
                );
            })
            console.log(`texture repo added ${textureFile}`)
            mTextureRepository[textureFile] = texture;
        }

        return mTextureRepository[textureFile];
    }

    async function loadMaterial({
        fileID,
        onProgress,
        repo_ip,
        reload = false
    }) {

        if (mMaterialRepository[fileID] && reload === false) return mMaterialRepository[fileID];

        let resp = await comFileDownload({
            fileID: fileID,
            hostUrl: repo_ip ? repo_ip : ''
        })

        let matJsondata = await resp.json()

        console.log(matJsondata)

        const _loader = new THREE.MaterialLoader();

        let material = _loader.parse(matJsondata);

        console.log(material)

        mMaterialRepository[fileID] = material;

        //diifuse map 있으면 로드
        if (material.userData?.texture?.id) {
            const fileInfo = material.userData.texture;
            let _tex = await loadTexture({
                textureFile: fileInfo.id,
                repo_ip: fileInfo.repo_ip,
                onProgress: onProgress ? onProgress : null,
                type: fileInfo.type
            });
            material.map = _tex;
        }

        //alpha map 있으면 로드
        if (material.userData?.alphaMap?.id) {
            const fileInfo = material.userData.alphaMap;
            let _tex = await loadTexture({
                textureFile: fileInfo.id,
                repo_ip: fileInfo.repo_ip,
                onProgress: onProgress ? onProgress : null,
                type: fileInfo.type
            });
            material.alphaMap = _tex;
        }

        //normal map 있으면 로드
        if (material.userData?.normalMap?.id) {
            const fileInfo = material.userData.normalMap;

            let _tex = await loadTexture({
                textureFile: fileInfo.id,
                repo_ip: fileInfo.repo_ip,
                onProgress: onProgress ? onProgress : null,
                type: fileInfo.type
            });
            material.normalMap = _tex;
        }
        //bump map 있으면 로드
        if (material.userData?.bumpMap?.id) {
            const fileInfo = material.userData.bumpMap;
            let _tex = await loadTexture({
                textureFile: fileInfo.id,
                repo_ip: fileInfo.repo_ip,
                onProgress: onProgress ? onProgress : null,
                type: fileInfo.type
            });
            material.bumpMap = _tex;
        }

        if (material.userData?.roughnessMap?.id) {
            const fileInfo = material.userData.roughnessMap;

            let _tex = await loadTexture({
                textureFile: fileInfo.id,
                repo_ip: fileInfo.repo_ip,
                onProgress: onProgress ? onProgress : null,
                type: fileInfo.type
            });
            material.roughnessMap = _tex;
        }

        if (material.userData?.metalnessMap?.id) {
            const fileInfo = material.userData.metalnessMap;

            let _tex = await loadTexture({
                textureFile: fileInfo.id,
                repo_ip: fileInfo.repo_ip,
                onProgress: onProgress ? onProgress : null,
                type: fileInfo.type
            });
            material.metalnessMap = _tex;
        }

        if (material.userData?.displacementMap?.id) {
            const fileInfo = material.userData.displacementMap;

            let _tex = await loadTexture({
                textureFile: fileInfo.id,
                repo_ip: fileInfo.repo_ip,
                onProgress: onProgress ? onProgress : null,
                type: fileInfo.type
            });
            material.displacementMap = _tex;
        }

        if(material.userData?.envMap?.id){
            const fileInfo = material.userData.envMap;
            let _tex = await loadTexture({
                textureFile: fileInfo.id,
                repo_ip: fileInfo.repo_ip,
                onProgress: onProgress ? onProgress : null,
                type: fileInfo.type
            });

            _tex.mapping = THREE.EquirectangularReflectionMapping;
            _tex.encoding = THREE.sRGBEncoding;

            material.displacementMap = _tex;
        }
        //emissive map 있으면 로드
        if (material.userData?.emissiveMap?.id) {
            const fileInfo = material.userData.emissiveMap;

            let _tex = await loadTexture({
                textureFile: fileInfo.id,
                repo_ip: fileInfo.repo_ip,
                onProgress: onProgress ? onProgress : null,
                type: fileInfo.type
            });
            material.emissiveMap = _tex;
        }
        //ao map 있으면 로드
        if (material.userData?.aoMap?.id) {
            const fileInfo = material.userData.aoMap;

            let _tex = await loadTexture({
                textureFile: fileInfo.id,
                repo_ip: fileInfo.repo_ip,
                onProgress: onProgress ? onProgress : null,
                type: fileInfo.type
            });
            material.aoMap = _tex;
        }

        console.log(`load matrial ${fileID}`, material);

        return material;
    }

    async function disposeMaterial({ fileID }) {
        if (mMaterialRepository[fileID]) {
            mMaterialRepository[fileID].dispose();
            delete mMaterialRepository[fileID];
        }
    }

    //envmap
    async function setEnvMap({
        file_id,
        repo_ip,
        type,
        onProgress,
        bShow = true
    }) {

        const texture = await loadTexture({
            textureFile: file_id,
            onProgress: onProgress ? onProgress : null,
            repo_ip: repo_ip,
            type: type
        });

        console.log('load complete')

        texture.mapping = THREE.EquirectangularReflectionMapping;
        // texture.encoding = THREE.sRGBEncoding;
        
        bShow ? scope.scene.background = texture : scope.scene.background = null;
        scope.scene.environment = texture;
        //사용자변수 등록 
        scope.userData.envMapTexure = texture;
    }

    //scene entity

    function setMaterialToEntity({ entity, material, materialFile }) {

        // let _root = selectPrefabRoot(entity);
        // _root.userData.materialFile = materialFile;

        if (entity.isMesh) {
            entity.material = material;
            // entity.userData.materialFile = materialFile;
        }

        let bDone = false;
        entity.traverseAncestors(parent => {
            if (parent.isPrefabRoot) {
                if (!bDone) {
                    bDone = true;
                    parent.materialFile = {
                        id: materialFile.id,
                        repo_ip: materialFile.repo_ip
                    };
                }
            }
        });

        // entity.traverse((child) => {
        //     if (child.isMesh) {
        //         child.material = material;
        //     }
        // });
    }

    const addObject_fbx = async function ({ file_id, repo_ip, onProgress }) {
        let _obj = await loadFbx({
            fileID: file_id,
            // material: material,
            repo_ip: repo_ip,
            onProgress
        });
        if (_obj) {
            console.log(_obj)
            // scope.addObject(_obj);
            scope.root_dummy.add(_obj);
            return _obj;
        }
        return null
        // scope.root_dummy.add(_obj);
    }

    const addObject = async function ({
        parent = null,
        entity = null,
        modelFile, textureFile, fileId,
        diffuseColor,
        onProgress,
        roughness = 0.5,
        metalness = 0.5,
        bumpScale = 0.01,
    }) {

        if (entity) {
            parent ? parent.add(entity) : scope.root_dummy.add(entity);
            return entity;
        }
        else {
            try {

                let object = fileId ? mEntityRepository[fileId] : undefined;
                // if(fileId ) 
                //     object = mObjectRepository[fileId]
                if (object === undefined) {
                    const textureMap = await scope.loadTexture({ textureFile, onProgress });

                    object = await scope.loadFbx({
                        textureMap,
                        modelFile,
                        diffuseColor,
                        onProgress
                    });

                    object.userData = {
                        fileId,
                        fileName: modelFile,
                        diffuseColor,
                        roughness,
                        metalness,
                        bumpScale,
                    }

                    // scope.root_dummy.add(object);
                    fileId ? mEntityRepository[fileId] = object : null;
                    // mObjectRepository[fileId] = object;
                }

                parent ? parent.add(object) : scope.root_dummy.add(object);

                return object;
            }
            catch (e) {
                console.log(e);
            }

        }
    }

    const clearObject = function () {

        scope.select_node ? scope.trn_control?.detach(scope.select_node) : null;

        while (scope.root_dummy.children.length > 0) {
            scope.root_dummy.remove(scope.root_dummy.children[0]);
        }
    }

    const addPlane = function ({
        width = 100,
        height = 100,
        color = 0x00ff00,
        map = null,
    }) {
        const geometry = new THREE.PlaneGeometry(width, height, 1);
        const material = new THREE.MeshStandardMaterial({
            map: map,
            color: color
        });
        const plane = new THREE.Mesh(geometry, material);
        // plane.rotation.x = -(Math.PI / 2);
        // plane.position.y = -0.1;
        scope.root_dummy.add(plane);

        return plane;
    }

    /////////////////////////////
    /*
    isPrefabRoot가 true인 오브젝트를 찾아 반환한다. 만약 없으면 자기 자신을 보낸다.
    */
    function selectPrefabRoot(entity) {

        let _ent = entity ? entity : scope.select_node;

        // let __ent = _ent;

        while (_ent && !_ent?.isPrefabRoot) {

            // if () {
            //     // scope.select_node = _ent;
            //     return _ent;
            //     break;
            // }

            _ent = _ent.parent;

        }
        return _ent;
    }


    async function savePrefab({ entity, fileID = null, repo_ip = '', name }) {

        const _data = entity.toJSON();

        const str_data = JSON.stringify(_data);

        name ? null : name = entity.name;

        const _res = await textDataUpload({
            name: name,
            title: `${name}.prefab`,
            data: str_data,
            directory: 'prefab',
            id: fileID,
            repo_ip: repo_ip
        })

        if (_res.data?.insertedId) {
            entity.userData.fileInfo = {
                id: _res.data?.insertedId,
                repo_ip: repo_ip
            }
        }
        // console.log(_res)
        return _res
        // }
        // else {
        //     return {
        //         r: 'error',
        //         msg: 'no prefab root'
        //     };
        // }
    }
    async function loadPrefab({ fileID, repo_ip }) {

        if (mEntityRepository[fileID]) {

            console.log(`${fileID} is already loaded`)

            return mEntityRepository[fileID].clone();
        }
        else {

            let resp = await comFileDownload({
                fileID: fileID,
                hostUrl: repo_ip
            })

            let _jsondata = await resp.json()

            const _loader = new elvisObjLoader(this);
            const obj = await _loader.parseAsync(_jsondata)

            // addObject({
            //     entity: obj
            // })

            console.log(obj)
            obj.userData.fileInfo = {
                id: fileID,
                repo_ip: repo_ip
            }

            mEntityRepository[fileID] = obj

            return obj.clone();
        }

    }

    async function resolvePrefab({ entity, onProgress }) {

        if (entity.isElvisObject3D) {

            if (entity.geometryFile) {
                if (!entity.geometryFile.resolve) {

                    let loader;

                    if (entity.geometryFile.format.includes('fbx')) {
                        loader = loadFbx;
                    }
                    else {
                        loader = loadGlf;
                    }

                    let child_entity = await loader({
                        fileID: entity.geometryFile.id,
                        repo_ip: entity.geometryFile.repo_ip,
                        onProgress: onProgress
                    })

                    //apply transform
                    if (entity.childTransforms) {
                        let childTransforms = entity.childTransforms;
                        for (let i = 0; i < childTransforms.length; i++) {
                            const childTransform = childTransforms[i];

                            if (childTransform.name !== '') {
                                const child = child_entity.getObjectByProperty('name', childTransform.name);
                                if (child !== undefined) {
                                    // child.matrixAutoUpdate = false;
                                    child.matrix.fromArray(childTransform.matrix);
                                    child.matrix.decompose(child.position, child.quaternion, child.scale);
                                }
                            }
                        }
                    }
                    entity.add(child_entity)

                    entity.geometryFile.resolve = true;
                }
            }

            if (entity.materialFile) {
                if (!entity.materialFile.resolve) {
                    let material = await loadMaterial({
                        fileID: entity.materialFile.id,
                        repo_ip: entity.materialFile.repo_ip,
                        onProgress: onProgress
                    })
                    entity.traverse((child) => {
                        if (child.isMesh) {
                            child.material = material;
                        }
                    });
                    entity.materialFile.resolve = true;
                }

            }

        }

    }

    const unresolvedPrefab = function ({entity}) {
            
            // if (entity.isElvisObject3D) {
    
            //     if (entity.geometryFile) {
            //         if (!entity.geometryFile.resolve) {
            //             return true;
            //         }
            //         entity.geometryFile.resolve = false;

                    

                    


            //     }
    
            //     if (entity.materialFile) {
            //         if (!entity.materialFile.resolve) {
            //             return true;
            //         }
            //     }
    
            // }
    
            return false;
    }
        

    const resolveChildPrefab = async ({entity, onProgress}) => {
        let _waitCount = 0;
        await new Promise((resolve, reject) => {
            entity.traverse(async (child) => {

                _waitCount++;
                if (child.isElvisObject3D) {

                    await resolvePrefab({
                        entity: child,
                        progress: (progress) => {
                            onProgress?.({
                                progress
                            });
                            // _Context.progressBox.update(progress);
                        }
                    });

                    _waitCount--;
                }
                else {
                    await new Promise((resolve, reject) => {
                        setTimeout(() => {

                            resolve();
                        }, 100);
                    });
                    _waitCount--;
                }

                // console.log('waitCount', _waitCount);
                if (_waitCount === 0) {
                    resolve();
                }


            });
        });

    }


    ////////////////////////////////
    //scene 
    async function saveScene({ entity, name = 'nope', fileID = null, repo_ip = '' }) {

        const _entity = entity ? entity : scope.root_dummy;

        let _data = _entity.toJSON();

        console.log(_data)

        const str_data = JSON.stringify(_data);

        name ? null : name = entity.name;

        const _res = await textDataUpload({
            name: name,
            title: `${name}.scene`,
            data: str_data,
            directory: 'scene',
            id: fileID,
            repo_ip: repo_ip
        })

        if (_res.data?.insertedId) {
            _entity.userData.fileInfo = {
                id: _res.data?.insertedId,
                repo_ip: repo_ip
            }
        }
        return _res;

        // _json.images = [];
        // _json.textures = [];
        // _json.materials = [];
        // // _json.geometries = [];
        // // const object = _json.object

        // console.log(_json);

        // try {
        //     const str_data = JSON.stringify(_json);

        //     const _res = await textDataUpload({
        //         name: name,
        //         data: str_data,
        //         directory: 'scene'
        //     })

        //     console.log(_res)
        //     return _res

        // }
        // catch (e) {
        //     return {
        //         r: 'error',
        //         msg: 'no prefab root'
        //     };
        // }
    }

    async function loadScene({ fileID, repo_ip }) {

        let _jsondata = await (await comFileDownload({
            fileID: fileID,
            hostUrl: repo_ip
        })).json();

        console.log(_jsondata)

        const _loader = new elvisObjLoader(this);
        const obj = await _loader.parseAsync(_jsondata)

        obj.userData.fileInfo = {
            id: fileID,
            repo_ip: repo_ip
        }


        return obj;
    }

    ////////////////////////////////
    //gameobject
    function initGameObjectSystem() {

        if (scope.gameObj_dummy) {
            scope.gameObj_dummy.removeFromParent();
        }

        scope.gameObj_dummy = new THREE.Group();
        scope.gameObj_dummy.name = 'gameObj_dummy';
        scope.scene.add(scope.gameObj_dummy);

        scope.onUpdate = function (event) {

            scope.gameObj_dummy?.traverse((child) => {
                if (
                    child.isElvisGameObject ||
                    child.isZeroWalkerObject
                    ) {
                    child.update(event);
                }
            });
        }
        console.log('gameobject system ready')

    }

    function addGameObject({ entity }) {
        scope.gameObj_dummy.add(entity);
    }

    function addHostGameObject({ socket, roomName, sceneMng, user }) {
        let hostObj = new gameObject({ socket, roomName, sceneMng, user });
        hostObj.name = 'host';
        addGameObject({
            entity: hostObj,
        });
    }

    function addGuestGameObject({ user, socket, roomName, sceneMng, data }) {
        let remoteObj = new dummyObject({ socket, roomName, sceneMng, user });
        remoteObj.remoteUser = user;
        // remoteObj.remoteSocketId = socket.id;

        addGameObject({
            entity: remoteObj
        });

        remoteObj.receiveControl(
            {
                data: data,
                user: user
            }
        );
    }

    function removeGameObject({ socketId }) {
        if (socketId)
            return scope.gameObj_dummy.getObjectByProperty('socketId', socketId)?.removeFromParent();
        return null;
    }

    function removeAllGameObject() {

        while (scope.gameObj_dummy.children.length > 0) {
            scope.gameObj_dummy.children[0].removeFromParent();
        }

        // scope.gameObj_dummy.children.forEach((child) => {
        //     child.removeFromParent();
        // })
    }

    function getGameObjectBysocketId({ socketId }) {
        return scope.gameObj_dummy.getObjectByProperty('socketId', socketId);
    }



    return {
        getSceneMng: function () {
            return mSceneMng;
        },
        getRootScene: function () {
            return scope.root_dummy;
        },
        addObject,
        addEntity: addObject,
        deleteEntity({ entity }) {
            scope.trn_control?.detach(entity);
            entity.removeFromParent();
        },
        attachEntity({ entity, parent }) {
            // attach child while maintaining the child's world transform.
            scope.scene.attach(entity);
            parent.attach(entity);
        },
        addObject_fbx,
        clearObject,
        addPlane,
        loadTexture,
        loadFbx,

        loadGlf,
        saveGlf,

        addMeshObject({ geometry, material, position, rotation, scale, parent }) {
            const object = new THREE.Mesh(geometry, material ? material : mDefaultStandardMaterial);
            position ? object.position.copy(position) : null;
            rotation ? object.rotation.copy(rotation) : null;
            scale ? object.scale.copy(scale) : null;
            parent ? parent.add(object) : scope.root_dummy.add(object);
            return object;
        },
        removeObject(id) {

            let object = id ? scope.root_dummy.getObjectById(id) : scope.select_node ? scope.select_node : null;

            if (object) {
                console.log(object);
                scope.trn_control?.detach(object);
                object.removeFromParent();
            }
            // object.parent.remove(object);
        },
        updateTranform({
            objId,
            position,
            rotation,
            scale
        }) {
            const _obj = objId ? scope.root_dummy.getObjectById(objId) : scope.select_node;
            if (_obj) {
                position ? _obj.position.copy(position) : null
                rotation ? _obj.rotation.copy(rotation) : null
                scale ? _obj.scale.copy(scale) : null
            }
        },

        //material
        loadMaterial,
        disposeMaterial,
        setMaterialToEntity,

        setEnvMap,

        //prefab
        selectPrefabRoot,
        savePrefab,
        loadPrefab,
        resolvePrefab,
        resolveChildPrefab,
        unresolvedPrefab,
        clearAllRepository,

        saveScene,
        loadScene,
        defaultMaterial: {
            standard: mDefaultStandardMaterial,
            wireframe: mDefaultWireframeMaterial
        },
        //gameobject
        initGameObjectSystem,
        addGameObject,
        addHostGameObject,
        addGuestGameObject,
        getGameObjectBysocketId,
        removeGameObject,
        removeAllGameObject
    }

}