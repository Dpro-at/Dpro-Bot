// Show in Finder: only a window of the app on its own origin may ask, and only for an existing absolute folder.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const vm=require('node:vm');
test('reveal folder accepts only the app origin, its own windows and a real absolute folder',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/main.cjs'),'utf8');
 const start=source.indexOf("// A project's folder in Finder / Explorer"),end=source.indexOf('});',source.indexOf("ipcMain.handle('dpro:reveal-folder'"))+3;
 const frame={url:'http://127.0.0.1:42522/'},contents={mainFrame:frame},main={webContents:contents},shown=[];let handler;
 const context={appOrigin:'http://127.0.0.1:42522',mainWindow:main,chatWindows:new Set(),URL,path,fs,
  BrowserWindow:{fromWebContents:c=>(c===contents?main:null)},shell:{showItemInFolder:p=>shown.push(p)},ipcMain:{handle(name,fn){assert.equal(name,'dpro:reveal-folder');handler=fn;}}};
 vm.runInNewContext(source.slice(start,end),context);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'girru-reveal-')),file=path.join(dir,'f.txt');fs.writeFileSync(file,'x');
 const ask=(folder,sender=contents,senderFrame=frame)=>handler({sender,senderFrame},folder);
 assert.equal(await ask(dir),true);assert.equal(shown.length,1);
 for(const bad of [file,'relative/dir',path.join(dir,'missing'),dir+'\n',5])assert.equal(await ask(bad),false,String(bad));
 assert.equal(await ask(dir,{}),false,'another window');
 assert.equal(await ask(dir,contents,{url:frame.url}),false,'a sub-frame');
 frame.url='https://remote.example/';assert.equal(await ask(dir),false,'another origin');
 assert.equal(shown.length,1);fs.rmSync(dir,{recursive:true,force:true});
});
