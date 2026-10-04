import {useRef,useState,type ReactNode} from 'react';
import {useContentTransition} from '@form-glass/react';

/** Keep the previous page until FORM captures it, then hand off to the next. */
export function ContentSwap({revision,children}:{revision:number;children:ReactNode}){
 const root=useRef<HTMLDivElement>(null),[painted,setPainted]=useState(revision),content=useRef(children);
 if(painted===revision)content.current=children;
 useContentTransition(String(revision),root,()=>{setPainted(revision);const viewport=root.current?.querySelector('.library-viewport');if(viewport)viewport.scrollTop=0;});
 return <div ref={root} className="library-page">{content.current}</div>;
}
