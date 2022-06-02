var H=Object.create;var i=Object.defineProperty;var j=Object.getOwnPropertyDescriptor;var F=Object.getOwnPropertyNames,h=Object.getOwnPropertySymbols,M=Object.getPrototypeOf,m=Object.prototype.hasOwnProperty,O=Object.prototype.propertyIsEnumerable;var y=(e,n,t)=>n in e?i(e,n,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[n]=t,g=(e,n)=>{for(var t in n||(n={}))m.call(n,t)&&y(e,t,n[t]);if(h)for(var t of h(n))O.call(n,t)&&y(e,t,n[t]);return e};var I=(e,n)=>{for(var t in n)i(e,t,{get:n[t],enumerable:!0})},R=(e,n,t,s)=>{if(n&&typeof n=="object"||typeof n=="function")for(let o of F(n))!m.call(e,o)&&o!==t&&i(e,o,{get:()=>n[o],enumerable:!(s=j(n,o))||s.enumerable});return e};var v=(e,n,t)=>(t=e!=null?H(M(e)):{},R(n||!e||!e.__esModule?i(t,"default",{value:e,enumerable:!0}):t,e)),w=e=>R(i({},"__esModule",{value:!0}),e);var D={};I(D,{default:()=>d,delete:()=>N,get:()=>P,head:()=>J,isErrorStatus:()=>B,isSuccessStatus:()=>S,options:()=>A,patch:()=>k,post:()=>T,put:()=>_,raw:()=>f,request:()=>d});module.exports=w(D);var b=v(require("url")),c,l,q={http:function(){return c||(c=require("http")),c},https:function(){return l||(l=require("https")),l}};function C(e){let n=function(){return n.called||(n.called=!0,n.value=e.apply(this,arguments)),n.value};return n.called=!1,n}function f(e,n){let t=typeof e=="string"?{url:e}:g({},e),s=C(n);t.url&&x(t),t.headers==null&&(t.headers={}),t.maxRedirects==null&&(t.maxRedirects=10);let o=t.json?JSON.stringify(t.body):t.body;t.body=void 0,o&&!t.method&&(t.method="POST"),t.method&&(t.method=t.method.toUpperCase()),t.json&&(t.headers.accept="application/json"),t.json&&o&&(t.headers["content-type"]="application/json");let r=(t.protocol==="https:"?q.https():q.http()).request(t,a=>{if(a.statusCode>=300&&a.statusCode<400&&"location"in a.headers){t.url=a.headers.location,x(t),a.resume(),t.maxRedirects-=1,t.maxRedirects>0?(t.body=o,f(t,s)):s(new Error("too many redirects"));return}s(null,a)});return r.on("timeout",()=>{r.abort(),s(new Error("Request timed out"))}),r.on("error",s),z(o)?o.on("error",s).pipe(r):r.end(o),r}async function d(e){return new Promise((n,t)=>{f(e,function(s,o){if(s)return t(s);let p=[];o.on("data",function(r){p.push(r)}),o.on("end",function(){var r=Buffer.concat(p);if(typeof e=="object"&&e.json){if(r.length===0)return n(o);try{r=JSON.parse(r.toString()),o.data=r}catch(a){return t(a)}}else o.data=r;n(o)})})})}var E=d;function u(e){return function(t){return typeof t=="string"&&(t={url:t}),t.method=e.toUpperCase(),E(t)}}var P=u("get"),T=u("post"),_=u("put"),k=u("patch"),J=u("head"),N=u("delete");var A=u("options");function x(e){let n=b.default.parse(e.url);n.hostname&&(e.hostname=n.hostname),n.port&&(e.port=n.port),n.protocol&&(e.protocol=n.protocol),n.auth&&(e.auth=n.auth),e.path=n.path,delete e.url}function S(e){var n;return((n=e.statusCode)==null?void 0:n.toString()[0])==="2"}function B(e){return!S(e)}function z(e){return e!==null&&typeof e=="object"&&typeof e.pipe=="function"}0&&(module.exports={delete:null,get,head,isErrorStatus,isSuccessStatus,options,patch,post,put,raw,request});
