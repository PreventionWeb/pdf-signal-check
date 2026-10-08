/** Bound interactive help to one side of its trigger, keeping the trigger hitbox clear. */
export function helpPlacement(rect,{width,height},contentHeight) {
  const gap=6,edge=12,panelWidth=Math.min(340,width-2*edge);
  const below=Math.max(0,height-rect.bottom-gap-edge),above=Math.max(0,rect.top-gap-edge);
  const useBelow=contentHeight<=below || (contentHeight>above&&below>=above);
  const maxHeight=useBelow?below:above,renderedHeight=Math.min(contentHeight,maxHeight);
  return {width:panelWidth,left:Math.max(edge,Math.min(rect.left,width-panelWidth-edge)),top:useBelow?rect.bottom+gap:rect.top-gap-renderedHeight,maxHeight};
}
