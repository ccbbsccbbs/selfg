const TextureCfg = {
    logo: './res/logo.png',
}
const AudioCfg = {
    btn: './res/btn.mp3'
}
Promise.all([
    Sg.loadTextures(TextureCfg),
    Sg.loadAudios(AudioCfg)
]).then(startGame);

Sg.toggleNodeTree(false);

function startGame([textures, audios]) {

    const _stage = Sg.createStage('app', {
        width: 600,
        height: 800
    });


    const _createArray = function (len) {
        return Array.from({
            length: len
        })
    }
    const gridArr = _createArray(20).map(() => _createArray(10));


    const Edge = 40;
    const Half = 20;

    let _nowShape = null;
    let _nextShape = null;
    let globalRectArr = [];

    const GAME_STATE = {
        FALLING: 1,
        FAST: 2,
        LAND: 3,
        ELIMINATE: 4,
        FINISH: 5
    }

    function Shape() {
        this.rects = [];
        this.points = null;
        this.shapeArr = null;
        this.gridX = 0;
        this.gridY = 0;
    }

    function Rect(node_) {
        this.node = node_;
        this.gridX = 0;
        this.gridY = 0;
        this.isLand = false;
    }

    function createLogo() {
        const _logo = _stage.addChild(Sg.createSprite(textures.logo));
        _logo.x = 550;
        _logo.y = 755;
        _logo.zIndex = 2;
        _logo.scale= 0.5;
    }
    createLogo();

    function createOptionPanel() {
        const _panel = _stage.addChild(Sg.createDiv((ctx) => {
            ctx.fillStyle = '#eeeeee';
            ctx.rect(-100, -400, 200, 800);
            ctx.stroke();
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.rect(-50, -350, 100, 100);
            ctx.stroke();
            ctx.fill();
            nextShapePanelShow(ctx);
        }, {
            width: 200,
            height: 800
        }));
        _panel.x = 500;
        _panel.y = 400;
    }
    createOptionPanel();

    function nextShapePanelShow(ctx) {
        if (_nextShape) {
            ctx.beginPath();
            ctx.fillStyle = '#0361a9';
            ctx.strokeStyle = '#000000';
            _nextShape.points.forEach(v => {
                ctx.rect((v[0] * 2 - 1) * 10, (v[1] * 2 - 1) * 10 - 300, 20, 20);
            })
            ctx.stroke();
            ctx.fill();
        }
    }

    let _score = null;

    function createScore() {
        const _tip = _stage.addChild(Sg.createLabel('you score is'));
        _tip.x = 470;
        _tip.y = 250;

        _score = _stage.addChild(Sg.createLabel('0'));
        _score.x = 500;
        _score.y = 300;
    }
    createScore();

    function _drawShape(ctx) {
        ctx.lineWidth = 1;
        ctx.fillStyle = '#0361a9';
        ctx.rect(-Half, -Half, Edge, Edge);
    }

    function _randomItem(arr) {
        return [...arr].sort(() => Math.random() - 0.5)[0];
    }

    function _setShapeRectsPos(shape_) {
        _getShapeGridPos(shape_).forEach(([x, y], i) => {
            const _rect = shape_.rects[i];
            _rect.node.x = x * Edge + Half;
            _rect.node.y = y * Edge + Half;
            _rect.gridX = x;
            _rect.gridY = y;
        })
    }

    function _gameOver() {
        const _tip = _stage.addChild(Sg.createLabel('GAME OVER'));
        _tip.font = '80px arial';
        _tip.x = 300;
        _tip.y = 400;
    }

    function _createAShape() {
        const _shape = _nextShape || _randomAShape();
        _shape.rects.forEach(v => _stage.addChild(v.node));
        _shape.gridX = 2;
        _shape.gridY = 0;
        _setShapeRectsPos(_shape);
        _nowShape = _shape;
        _nextShape = _randomAShape();
    }

    function _randomAShape() {
        const _shape = new Shape();
        const _valueArr = [...Object.values(shapelist)];
        _shape.shapeArr = _randomItem(_valueArr);
        _shape.points = _randomItem(_shape.shapeArr);
        _shape.rects = _shape.points.map(() => {
            const _rect = new Rect(Sg.createDiv(_drawShape));
            return _rect;
        });
        return _shape;
    }

    /* 
    entry
    */
    let _gameState = GAME_STATE.FALLING;
    const FastNumBase = 5;
    let _nowCalc = 0;
    let _intId = setInterval(() => {
        switch (_gameState) {
            case GAME_STATE.FINISH:
                _gameOver();
                clearInterval(_intId);
            case GAME_STATE.ELIMINATE:
            case GAME_STATE.LAND:
                return;
            case GAME_STATE.FALLING:
                if (_nowCalc++ < FastNumBase) return;
                break;
        }
        _nowCalc = 0;
        _fallNowShape();
    }, 100);

    function _fallNowShape() {
        if (_nowShape) {
            if (_canDrop(_nowShape)) {
                _nowShape.gridY += 1;
                _setShapeRectsPos(_nowShape);
            } else {
                _land(_nowShape);
                _judgeEliminate();
            }
        } else {
            _createAShape();
        }
    }


    function _judgeEliminate() {
        if (_gameState == GAME_STATE.FINISH) return;
        _gameState = GAME_STATE.ELIMINATE;
        const [_lineIndex, _linesNum] = _eliminateLines();
        if (_lineIndex <= 0) {
            _gameState = GAME_STATE.FALLING;
        } else {
            _fallRects(_lineIndex, _linesNum);
        }
        _score.string = +_score.string + 100 * _linesNum;
    }

    function _getShapeGridPos(shape_) {
        return shape_.points.map(v => [shape_.gridX + v[0], shape_.gridY + v[1]]);
    }

    function _canEliminate(arr) {
        return arr.reduce((s, v) => s + (!!v ? 1 : 0), 0) == 10;
    }

    function _eliminateLines() {
        const _topEliminateLineIndex = gridArr.findIndex(line => _canEliminate(line));
        const _needElimatedArr = gridArr.filter(line => _canEliminate(line));
        _needElimatedArr.forEach(arr => {
            arr.forEach(rect => {
                _stage.removeChild(rect.node);
                rect.node = null;
                rect = null;
            })
            globalRectArr = globalRectArr.filter(v => v.node);
            arr.fill(undefined);
        })
        return [_topEliminateLineIndex, _needElimatedArr.length];
    }

    function _land(shape_) {
        if (!!_getShapeGridPos(shape_).find(v => v[1] < 0)) {
            _gameState = GAME_STATE.FINISH;
            return;
        }
        _gameState = GAME_STATE.LAND;
        _nowShape = null;
        _getShapeGridPos(shape_).forEach(([x, y], i) => {
            gridArr[y][x] = shape_.rects[i];
        })
        shape_.rects.forEach(v => v.isLand = true);
        globalRectArr.push(...shape_.rects);
    }

    function _fallRects(gridY_, num_) {
        const _arr = globalRectArr.filter(v => v.gridY < gridY_);
        _arr.forEach(v => {
            gridArr[v.gridY][v.gridX] = undefined;
        })
        _arr.forEach(v => {
            v.gridY += num_;
            try {
                v.node.y += Edge * num_;
            } catch (error) {
                console.log(v);
                console.log(_arr);
                console.log(error);
            }
        })
        _arr.forEach(v => {
            gridArr[v.gridY][v.gridX] = v;
        })
        if (num_ > 0) {
            setTimeout(() => {
                _gameState = GAME_STATE.FALLING;
            }, 500);
        }
    }

    function _canDrop(shape_) {
        let _can = true;
        _getShapeGridPos(shape_).forEach(([x, y]) => {
            if (y < 0) return;
            if (y + 1 === 20) {
                _can = false;
            } else if (!!gridArr[y + 1][x]) {
                _can = false;
            }
        })
        return _can;
    }


    function _canMoveEdge(shape_, isLeft_) {
        let _can = true;
        _getShapeGridPos(shape_).forEach(([x, y]) => {
            if (y < 0) return;
            if (x === (isLeft_ ? 0 : 9)) {
                _can = false;
            } else if (!!gridArr[y][x + (isLeft_ ? -1 : 1)]) {
                _can = false;
            }
        })
        return _can;
    }

    function _canLeftMove(shape_) {
        return _canMoveEdge(shape_, true);
    }

    function _canRightMove(shape_) {
        return _canMoveEdge(shape_, false);
    }

    function _canChangeOri(shape_) {
        let _can = true;
        _getShapeGridPos(shape_).forEach(([x, y]) => {
            switch (true) {
                case y >= 19:
                case x < 0:
                case x >= 9:
                    _can = false;
                    break;
                case !!gridArr[y] && !!gridArr[y][x]:
                    _can = false;
                    break;
            }
        })
        return _can;
    }

    function _changeShapeOri(shape_) {
        if (_gameState == GAME_STATE.FAST) return;
        const _nowIndex = _nowShape.shapeArr.indexOf(_nowShape.points);
        let _nextIndex = _nowIndex;
        if (_nowIndex === _nowShape.shapeArr.length - 1) {
            _nextIndex = 0;
        } else {
            _nextIndex++;
        }
        const _nextPoints = _nowShape.shapeArr[_nextIndex];
        if (_canChangeOri({
                points: _nextPoints,
                gridX: _nowShape.gridX,
                gridY: _nowShape.gridY
            })) {
            _nowShape.points = _nextPoints;
        }
    }

    Sg.addKeyboardEventCb(code => {
        if (!_nowShape) return;
        switch (code) {
            case 'KeyA':
            case 'ArrowLeft':
                if (_canLeftMove(_nowShape)) {
                    _nowShape.gridX -= 1;
                    _setShapeRectsPos(_nowShape);
                    Sg.playSound(audios.btn);
                }
                break;
            case 'KeyD':
            case 'ArrowRight':
                if (_canRightMove(_nowShape)) {
                    _nowShape.gridX += 1;
                    _setShapeRectsPos(_nowShape);
                    Sg.playSound(audios.btn);
                }
                break;
            case 'KeyS':
            case 'ArrowDown':
                if (_canDrop(_nowShape)) {
                    _gameState = GAME_STATE.FAST;
                    Sg.playSound(audios.btn);
                }
                break;
            case 'KeyW':
            case 'ArrowUp':
            case 'Space':
                _changeShapeOri(_nowShape);
                Sg.playSound(audios.btn);
                break;
        }
    })
}
const shapelist = {
    shape_4: [
        [
            [0, 0],
            [0, -1],
            [1, -1],
            [1, 0]
        ]
    ],
    shape_z: [
        [
            [0, 0],
            [0, -1],
            [1, 0],
            [1, 1],
        ],
        [
            [0, 0],
            [1, 0],
            [0, 1],
            [-1, 1],
        ]
    ],
    shape_s: [
        [
            [0, 0],
            [0, -1],
            [-1, 0],
            [-1, 1]
        ],
        [
            [0, 0],
            [1, 0],
            [0, -1],
            [-1, -1]
        ]
    ],
    shape_l: [
        [
            [0, 0],
            [0, -1],
            [0, 1],
            [1, 1]
        ],
        [
            [0, 0],
            [1, 0],
            [-1, 0],
            [-1, 1]
        ],
        [
            [0, 0],
            [0, 1],
            [0, -1],
            [-1, -1]
        ],
        [
            [0, 0],
            [-1, 0],
            [1, 0],
            [1, -1]
        ]
    ],
    shape_rl: [
        [
            [0, 0],
            [0, -1],
            [0, 1],
            [-1, 1]
        ],
        [
            [0, 0],
            [1, 0],
            [-1, 0],
            [-1, -1]
        ],
        [
            [0, 0],
            [0, 1],
            [0, -1],
            [1, -1]
        ],
        [
            [0, 0],
            [-1, 0],
            [1, 0],
            [1, 1]
        ]
    ],
    shape_t: [
        [
            [0, 0],
            [0, -1],
            [0, 1],
            [-1, 0]
        ],
        [
            [0, 0],
            [1, 0],
            [-1, 0],
            [0, -1]
        ],
        [
            [0, 0],
            [0, 1],
            [0, -1],
            [1, 0]
        ],
        [
            [0, 0],
            [-1, 0],
            [1, 0],
            [0, 1]
        ]
    ],
    shape_long: [
        [
            [0, 0],
            [0, -1],
            [0, -2],
            [0, 1]
        ],
        [
            [0, 0],
            [1, 0],
            [2, 0],
            [-1, 0]
        ]
    ]
}