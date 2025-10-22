// globals.d.ts ou types/global.d.ts
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}