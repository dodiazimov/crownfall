const {test}=require('node:test');
const assert=require('node:assert/strict');
const {cameraAt}=require('../dist/experience.js');
for(const [width,height] of [[1440,700],[768,800],[390,500],[320,300],[844,180]]) {
 test(`full map and zoom stay usable at ${width}×${height}`,()=>{
  global.window={innerWidth:width,innerHeight:height};
  const fit=cameraAt(1,200,200);
  assert.ok(fit.x<=0&&fit.y<=0&&fit.x+fit.w>=2200&&fit.y+fit.h>=1500);
  assert.ok(Math.abs(fit.w/fit.h-width/height)<.01);
  const zoom=cameraAt(3.5,1900,1100);
  assert.ok(zoom.w<fit.w&&zoom.h<fit.h);
  assert.ok(1900>=zoom.x&&1900<=zoom.x+zoom.w);
  delete global.window;
 });
}
