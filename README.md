# selfg
a simple canvas game frame, just 30kb

> selfg.js is the frame code file <br>
> other files is the template (it is a Tetris game~)

so if you want start a simple canvas 2d game<br>
**just copy the selfg.js**

if you have any suggestion<br>
please tell me<br>
thanks<br>

## how to use
### global variable
if you link the selfg.js in your html file<br>
you can use **Sg** as the frame tools<br>

### preload res
if you want create a game with pic and sound<br>
you should use **Sg.loadTexture** or **Sg.loadAudio**<br>
like:<br>
```js
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
```

### create node
in this frame almost every thing is node<br>
you can create **sprie\label\div** right now<br>
like:<br>
```js
Sg.createSprite(textures.logo);//a sprite node
Sg.createLabel('hello world');//a label node
Sg.createDiv((ctx)=>ctx.rect(0,0,50,50));//a div node
```
div node is a new and exciting func,you will like it

### create stage
every thing should play in the stage<br>
so you will create a stage to add these node<br>
like:
```js
const _stage = Sg.createStage('app', {
  width: 600,
  height: 800
});
 _stage.addChild(/* one node */);
```

### collision componet
you can add a collision componet to your node

### action
you can run a action with your node<br>
it can use **to\by\call** right now<br>

## and so on
