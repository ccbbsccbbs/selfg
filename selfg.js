const Sg = (function () {
    function toAngle(degree) {
        return degree * 180 / Math.PI;
    }

    function toDegree(angle) {
        return angle * Math.PI / 180;
    }

    function isClickIn(v2, node) {
        const centerPos = node.worldCenterPos;
        const _nodeFinalWidth = node.width * node.worldScale.x;
        const _nodeFinalHeight = node.height * node.worldScale.y;
        const _isXIn =
            (v2.x > centerPos.x - _nodeFinalWidth / 2) &&
            (v2.x < centerPos.x + _nodeFinalWidth / 2);
        const _isYIn =
            (v2.y > centerPos.y - _nodeFinalHeight / 2) &&
            (v2.y < centerPos.y + _nodeFinalHeight / 2);
        return _isXIn && _isYIn;
    }


    const COMMON_CFG = {
        NORMAL_WIDTH: 480,
        NORMAL_HEIGHT: 320
    }
    let uid = 0;
    let gError = '';
    let nodeTree = null;

    function V2(x, y) {
        if (!(this instanceof V2)) {
            return new V2(x, y);
        }
        this.x = x;
        this.y = y;
    }

    V2.from = function (array) {
        return new V2(array[0], array[1]);
    }
    V2.clone = function (v2) {
        return new V2(v2.x, v2.y);
    }
    V2.prototype = {
        _fomatV2(v2) {
            if (v2 instanceof V2) {
                return v2;
            }
            return new V2(+v2, +v2);
        },
        add(v2) {
            v2 = this._fomatV2(v2);
            return new V2(this.x + v2.x, this.y + v2.y);
        },
        mul(v2) {
            v2 = this._fomatV2(v2);
            return new V2(this.x * v2.x, this.y * v2.y)
        },
        sub(v2) {
            v2 = this._fomatV2(v2);
            return new V2(this.x - v2.x, this.y - v2.y)
        },
        div(v2) {
            v2 = this._fomatV2(v2);
            return new V2(this.x / v2.x, this.y / v2.y)
        },
        [Symbol.iterator]() {
            let times = 2;
            return {
                next: () => {
                    times--;
                    if (times == 1) {
                        return {
                            value: this.x,
                            done: false
                        };
                    } else if (times == 0) {
                        return {
                            value: this.y,
                            done: false
                        };
                    } else {
                        return {
                            done: true
                        };
                    }
                }
            }
        }
    }

    //command design module
    function addNodeCommand(target, node, zIndex = 0) {
        node.zIndex = zIndex;
        node.parent = target;
        target.children.push(node);
    }

    function Stage(name_, opts = {}) {
        this._name = name_;
        this.uid = uid++;
        this.width = opts.width || COMMON_CFG.NORMAL_WIDTH;
        this.height = opts.height || COMMON_CFG.NORMAL_HEIGHT;
        this.children = [];
        this.onClick = null;
        this.pos = V2(0, 0);
        this.worldPos = V2(0, 0);
        this.worldAngle = 0;
        this.worldScale = V2(1, 1);
        this.worldCenterPos = V2(0, 0);
        this.worldOpacity = 1;
    }

    Stage.prototype = {
        setSize(opts = {
            width: COMMON_CFG.NORMAL_WIDTH,
            height: COMMON_CFG.NORMAL_HEIGHT
        }) {
            this.width = opts.width;
            this.height = opts.height;
        },
        /**
         * 
         * @param {Node} node 
         * @param {number} zIndex 
         * @returns {Node}
         */
        addChild(node, zIndex) {
            addNodeCommand(this, node, zIndex);
            _sg.renderNodeTree();
            return node;
        },
        removeChild(node) {
            this.children.splice(this.children.indexOf(node), 1);
        },
        removeAllChildren() {
            this.children.length = 0;
        }
    }

    function ClickEvent(x, y) {
        if (!(this instanceof ClickEvent)) {
            return new ClickEvent(x, y);
        }
        this.x = x;
        this.y = y;
    }

    function _Sg() {
        this._cvs = null;
        this._ctx = null;
        this._curStage = null;
        this.stages = {};
        this.textureCache = {};
        this.CollsionComp = CollsionComp;
        this.v2 = V2;
        this._canBubbleEvent = true;
        this.audioContent = null;
        this.audioCache = {};
        this._nowPlayingAudio = null;
        this.actionQuene = [];
        this._keyboardEventCbArr = [];
        this._dt = 0;
        this._lastTimestamp = 0;
        this._createCanvas()
            ._initAssetTree()
            ._initNodeTree()
            ._initAudioPlayer()
            ._initBorder()
            ._initClickEvent()
            ._initKeyboardEvent()
            ._update();
    }
    _Sg.prototype = {
        _createCanvas() {
            const _cvs = document.createElement('canvas');
            this.width = _cvs.width = COMMON_CFG.NORMAL_WIDTH;
            this.height = _cvs.height = COMMON_CFG.NORMAL_HEIGHT;
            this._ctx = _cvs.getContext('2d');
            _cvs.style.display = 'inline-block';
            document.body.appendChild(_cvs);
            this._cvs = _cvs;
            return this;
        },
        _initAssetTree() {
            // const _assetTree = document.createElement('ui');
            return this;
        },
        _initNodeTree() {
            const _nodeTree = document.createElement('ul');
            document.body.appendChild(_nodeTree);
            _nodeTree.style.display = 'inline-block';
            nodeTree = _nodeTree;
            return this;
        },
        _initAudioPlayer() {
            this.audioContent = document.createElement('div');
            document.body.appendChild(this.audioContent);
            return this;
        },
        _initClickEvent() {
            this._cvs.onclick = (e) => {
                const _triggerArr = [];
                const _arr = [
                    [null, _triggerArr]
                ];
                if (typeof this._curStage.onClick === 'function') {
                    _arr[0][0] = this._curStage;
                }
                this._getClickNode(e, this._curStage, _triggerArr);
                this._canBubbleEvent = true;
                this._emitClickEvent(_arr, e);
            }
            return this;
        },
        _initKeyboardEvent() {
            document.onkeydown = (e) => {
                //keyCode
                this._keyboardEventCbArr.forEach(func => func(e.code));
            }
            return this;
        },
        _resetCTX() {
            this._ctx.lineWidth = 2;
            this._ctx.strokeStyle = 'black';
            this._ctx.fillStyle = 'white';
        },
        toggleNodeTree(isShow_) {
            nodeTree.style.display = isShow_ ? 'inline_block' : 'none';
        },
        addKeyboardEventCb(cb) {
            if (typeof cb === 'function') {
                this._keyboardEventCbArr.push(cb);
            }
        },
        renderNodeTree() {
            nodeTree.innerText = '';
            this._setNodeTree(this._curStage, nodeTree);
        },
        _setNodeTree(node, el) {
            try {
                node.children.forEach(s => {
                    const _li = document.createElement('li');
                    _li.innerText = s.name;
                    el.appendChild(_li)
                    this._setNodeTree(s, _li);
                })
            } catch (error) {
                console.log(error)
                console.log(node)
            }

        },
        getCurStage() {
            return this._curStage;
        },
        preventClickEvent() {
            this._canBubbleEvent = false;
        },

        _getClickNode(e, parent, arr) {
            if (!parent) return;
            parent.children.forEach(node => {
                const _triggerArr = [];
                const _arr = [null, _triggerArr]
                arr.push(_arr)
                if (typeof node.onClick === 'function') {
                    if (isClickIn(V2(e.offsetX, e.offsetY), node)) {
                        _arr[0] = node;
                    }
                }
                this._getClickNode(e, node, _triggerArr);
            })
        },
        _emitClickEvent(triggerArr, e) {
            for (const [node, arr] of triggerArr) {
                if (arr.length) {
                    this._emitClickEvent(arr, e);
                }
                if (node) {
                    if (this._canBubbleEvent) {
                        node.onClick(ClickEvent(e.offsetX, e.offsetY));
                    }
                }
            }
        },

        _initBorder() {
            this._cvs.style.border = '1px solid #333333';
            return this;
        },
        _setCurStage(stage_) {
            this._curStage = stage_;
            this._cvs.width = stage_.width;
            this._cvs.height = stage_.height;
        },
        getCTX() {
            return this._ctx;
        },
        createStage(name_, opts) {
            const _stage = new Stage(name_, opts);
            if (!this._curStage) {
                this._setCurStage(_stage);
            }
            return _stage;
        },
        changeStage(name_) {
            this._curStage = this.stages[name_];
        },
        createDiv(drawFunc, opts, name = 'div') {
            const _div = new Div(drawFunc, opts);
            _div.name = name;
            return _div;
        },
        createSprite(texture, name = 'sprite') {
            const _sprite = new Sprite(texture);
            _sprite.name = name;
            return _sprite;
        },
        createLabel(str, name = 'label') {
            const _label = new Label(str);
            _label.name = name;
            return _label;
        },
        loadAudios(paths) {
            if (typeof paths !== 'object' || Array.isArray(paths)) {
                gError = '1st argu must be a object not array';
                return Promise.reject(gError);
            }
            const entryArr = Object.entries(paths);
            const keyArr = entryArr.map(v => v[0]);
            const pathArr = entryArr.map(v => v[1]);
            const _result = {};
            return Promise.all(
                pathArr.map(path => this.loadAudio(path))
            ).then(datas => {
                datas.forEach((data, i) => _result[keyArr[i]] = data)
                return Promise.resolve(_result);
            })
        },
        loadAudio(path) {
            if (this.audioCache[path]) return this.audioCache[path];
            const _audio = document.createElement('audio');
            _audio.src = path;
            return new Promise(resolve => {
                this.audioContent.appendChild(_audio);
                this.audioCache[path] = _audio;
                resolve(_audio);
            })
        },
        playSound(audio, loop_) {
            if (loop_) audio.loop = true;
            audio.play();
        },
        stopSound(audio) {
            audio.loop = false;
            audio.pause();
        },
        loadTextures(paths) {
            if (typeof paths !== 'object' || Array.isArray(paths)) {
                gError = '1st argu must be a object not array';
                return Promise.reject(gError);
            }
            const entryArr = Object.entries(paths);
            const keyArr = entryArr.map(v => v[0]);
            const pathArr = entryArr.map(v => v[1]);
            const _result = {};
            return Promise.all(
                pathArr.map(path => this.loadTexture(path))
            ).then(datas => {
                datas.forEach((data, i) => _result[keyArr[i]] = data)
                return Promise.resolve(_result);
            })
        },
        loadTexture(path) {
            let _img = new Image();
            _img.src = path;
            return new Promise(resolve => {
                _img.onload = () => {
                    createImageBitmap(_img).then(data => {
                        this.textureCache[path] = data;
                        resolve(data);
                        _img = null;
                    })
                }
            })
        },
        _update(dt = 0) {
            this._dt = (dt / 1000 - this._lastTimestamp);
            this._lastTimestamp = dt / 1000;
            if (gError) throw new Error(gError);
            this._rendering();
            requestAnimationFrame(dt => this._update(dt));
        },
        _rendering() {
            if (!this._curStage) return this;
            this._ctx.fillStyle = 'white';
            this._ctx.clearRect(0, 0, this._curStage.width, this._curStage.height);
            this._expanChilren(this._curStage.children);
            return this;
        },
        _updateComponent(node) {
            node.components.forEach(comp => {
                comp.update();
            })
        },
        _expanChilren(arr = [], parent) {
            arr.sort((a, b) => a.zIndex - b.zIndex);
            arr.forEach(node => {
                this._actionNode(node);
                this._drawNode(node);
                this._updateComponent(node);
                this._expanChilren(node.children, node);
            })
        },
        _actionNode(node) {
            node.updateAction(this._dt);
        },
        _drawNode(node) {
            this._ctx.translate(...node.worldPos);
            this._ctx.rotate(toDegree(node.worldAngle));
            this._ctx.scale(...node.worldScale);
            this._ctx.globalAlpha = node.worldOpacity;
            this._ctx.fillStyle = node.color;
            this['_draw' + node._class](node);
            this._ctx.translate(...node.worldPos.mul(-1));
            this._ctx.scale(1, 1);
            this._ctx.setTransform(1, 0, 0, 1, 0, 0);
            this._ctx.globalAlpha = 1;
        },
        _drawSprite(sprite) {
            this._ctx.drawImage(sprite.texture, ...sprite.ltPos);
        },
        _drawLabel(label) {
            this._ctx.font = label.font;
            this._ctx.fillText(label.string, ...label.ltPos);
        },
        _drawDiv(div) {
            this._resetCTX();
            this._ctx.beginPath();
            div.drawFunc(this._ctx);
            this._ctx.stroke();
            this._ctx.fill();
            this._resetCTX();
        },

    }
    const _sg = new _Sg();

    const PorxyNode = {
        get(target, key) {
            switch (key) {
                case 'x':
                    return target.pos.x;
                case 'y':
                    return target.pos.y;
                case 'worldPos':
                    return target.parent.worldPos.add(target.pos);
                case 'worldAngle':
                    return target.parent.worldAngle + target.angle;
                case 'worldOpacity':
                    return target.parent.worldOpacity * target.opacity;
                case 'worldScale':
                    return target.parent.worldScale.mul(target.scale);
                case 'centerPos':
                    return target.pos.add(V2(0.5, 0.5).sub(target.anchor).mul(V2(target.width, target.height).div(2)));
                case 'worldCenterPos':
                    return target.parent.worldCenterPos.add(target.centerPos);
                case 'ltPos':
                    return target.anchor.mul(-1).mul(new V2(target.width * target.scale.x, target.height * target.scale.y));
                default:
                    return target[key];
            }
        },
        set(target, key, value) {
            switch (key) {
                case 'x':
                    target.pos.x = value;
                    break;
                case 'y':
                    target.pos.y = value;
                    break;
                case 'width':
                    gError = 'can not set width , please set scale.x';
                    break;
                case 'height':
                    gError = 'can not set height , please set scale.y';
                    break;
                case 'scale':
                    if (typeof value === 'number') {
                        target.scale.x = value;
                        target.scale.y = value;
                    } else {
                        gError = 'can not set scale success';
                    }
                    break;
                case 'pos':
                    gError = 'can not set pos directly , please use pos.x or pos.y';
                    break;
                case 'name':
                    target[key] = value;
                    _sg.renderNodeTree();
                    return;
                default:
                    target[key] = value;
                    break;
            }
        }
    }
    const ProxyLabel = {
        get(target, key) {
            return PorxyNode.get(target, key);
        },
        set(target, key, value) {
            switch (key) {
                case 'string':
                    _sg._ctx.font = target.font;
                    target.width = _sg._ctx.measureText(value).width;
                    target.string = value;
                    _sg._ctx.font = '';
                    break;
                case 'font':
                    if (!value.match(/^\d+px \w+/)) {
                        gError = 'font set error! should like:20px arial';
                        return;
                    }
                    const _font = value.match(/^(\d+)px/);
                    target.height = _font ? _font[1] : 20;
                    target.font = value;
                    _sg._ctx.font = value;
                    target.width = _sg._ctx.measureText(target.string).width;
                    _sg._ctx.font = '';
                    break;
                default:
                    PorxyNode.set(target, key, value);
                    break;
            }
        }
    }

    function Node() {
        this.uid = uid++;
        this.anchor = new V2(0.5, 0.5);
        this.pos = new V2(0, 0);
        this.scale = new V2(1, 1);
        this.angle = 0;
        this.opacity = 1;
        this.color = '#000000';
        this.children = [];
        this.parent = null;
        this.components = new Map();
        this.zIndex = 0;
        this.name = '';
        this.onClick = null; //function
        this.actionArr = [];
    }
    Node.prototype = {
        addComponent(compClass) {
            if (this.components.has(compClass)) {
                gError = compClass.name + 'has exist!';
                return;
            }
            const comp = new compClass(this);
            this.components.set(compClass, comp)
        },
        getComponent(compClass) {
            return this.components.get(compClass);
        },
        removeComp(compClass) {
            this.components.delete(compClass);
        },
        addChild(node, zIndex) {
            addNodeCommand(this, node, zIndex);
            _sg.renderNodeTree();
            return node;
        },
        runAction() {
            const _action = new Action(this);
            this.actionArr.push(_action);
            return _action;
        },
        updateAction(dt) {
            this.actionArr.forEach(action => action.update(dt));
        }
    };

    function Action(node) {
        this.node = node;
        this.actionQuene = [];
    }
    Action.prototype = {
        to(time, opts) {
            const _primary = {};
            for (let i in opts) {
                if (this.node.hasOwnProperty(i)) {
                    if (this.node[i] instanceof V2) {
                        _primary[i] = V2.clone(this.node[i]);
                    } else {
                        _primary[i] = this.node[i];
                    }
                }
            }
            this.actionQuene.push([time, 0, opts, _primary])
        },
        by(time, opts) {
            const _opts = {
                ...opts
            };
            for (let i in _opts) {
                if (this.node.hasOwnProperty(i)) {
                    if (_opts[i] instanceof V2) {
                        _opts[i] = this.node[i].add(_opts[i]);
                    } else {
                        _opts[i] += this.node[i];
                    }
                }
            }
            this.to(time, _opts);
        },
        call(cb) {
            this.actionQuene.push(cb)
        },
        update(dt) {
            if (this.actionQuene.length === 0) return;
            const _first = this.actionQuene[0];
            if (typeof _first === 'function') {
                _first();
            } else {
                let [duration, now, kvs, primary] = _first;
                const ratio = now / duration;
                for (let i in kvs) {
                    if (this.node.hasOwnProperty(i)) {
                        if (this.node[i] instanceof V2) {
                            const _v2 = this.node[i];
                            const _priV2 = primary[i];
                            _v2.x = _priV2.x + (kvs[i].x - _priV2.x) * ratio;
                            _v2.y = _priV2.y + (kvs[i].y - _priV2.y) * ratio;
                        } else {
                            this.node[i] = primary[i] + (kvs[i] - primary[i]) * ratio;
                        }
                    }
                }
                now += dt;
                _first[1] = now;
                if (now >= duration) {
                    this.actionQuene.shift();
                }
            }
        }
    }

    function Sprite(bitmapData) {
        Node.call(this);
        this.width = bitmapData.width;
        this.height = bitmapData.height;
        this.texture = bitmapData;
        this._class = 'Sprite';
        return new Proxy(this, PorxyNode);
    };
    Object.setPrototypeOf(Sprite.prototype, Node.prototype);


    function Label(str) {
        Node.call(this);
        this.string = str;
        this.font = '20px Verdana';
        this.width = _sg._ctx.measureText(str).width;
        this.height = this.font.match(/^(\d+)px/)[1];
        this._class = 'Label';
        return new Proxy(this, ProxyLabel);
    }
    Object.setPrototypeOf(Label.prototype, Node.prototype);

    function Div(drawFunc, opts = {}) {
        Node.call(this);
        this.drawFunc = drawFunc;
        this.width = opts.width || 100;
        this.height = opts.height || 100;
        this._class = 'Div';
        return new Proxy(this, PorxyNode);
    }
    Object.setPrototypeOf(Div.prototype, Node.prototype);

    function Comp(node) {
        this.uid = uid++;
        this.node = node;
        this.name = '';
    };
    Comp.prototype = {
        destory() {
            this.node.removeComp(this.class);
            this.node = null;
        }
    }

    function CollsionComp(node) {
        Comp.call(this, node);
        this.name = 'Comp.CollsionComp';
        this.class = CollsionComp;
        this.collsionTargetArr = [];
        this.onCollision = null;
    }
    CollsionComp.prototype = {
        bindCollsionTarget(node) {
            if (node == this.node) {
                gError = 'can not add self node';
                return;
            }
            if (this.collsionTargetArr.indexOf(node) > -1) {
                gError = 'already add this target';
                return;
            };
            this.collsionTargetArr.push(node);
        },
        update() {
            if (typeof this.onCollision !== 'function') return;
            const _self = this.node;
            const _collsionArr = this.collsionTargetArr.filter(node => {
                const _selfCenterPos = _self.centerPos;
                const _otherCenterPos = node.centerPos;
                const _isXCollsion = 2 * Math.abs(_selfCenterPos.x - _otherCenterPos.x) < _self.width + sprite.width;
                const _isYCollsion = 2 * Math.abs(_selfCenterPos.y - _otherCenterPos.y) < _self.height + sprite.height;
                if (_isXCollsion && _isYCollsion) {
                    return true;
                }
                return false;
            })
            _collsionArr.forEach(node => {
                this.onCollision(this.node, node);
            })
            if (_collsionArr.length) {
                this.onCollision = null;
            }
        }
    };
    Object.setPrototypeOf(CollsionComp.prototype, Comp.prototype);
    return _sg;
})();