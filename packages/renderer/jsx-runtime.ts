
import * as CSS from "csstype";
import { FunctionComponent, VirtualLayoutJSON } from "./src/types";
import type { StateSignal, ComputedSignal } from "@polymita/signal-model";

import { h } from "./src/index";

export const jsx = h;
export const jsxs = h;

export interface CSSProperties extends CSS.Properties<string | number> {}

export interface Events {
  // clipboard events
  onCopy: ClipboardEvent;
  onCut: ClipboardEvent;
  onPaste: ClipboardEvent;

  // composition events
  onCompositionend: CompositionEvent;
  onCompositionstart: CompositionEvent;
  onCompositionupdate: CompositionEvent;

  // drag drop events
  onDrag: DragEvent;
  onDragend: DragEvent;
  onDragenter: DragEvent;
  onDragexit: DragEvent;
  onDragleave: DragEvent;
  onDragover: DragEvent;
  onDragstart: DragEvent;
  onDrop: DragEvent;

  // focus events
  onFocus: FocusEvent;
  onFocusin: FocusEvent;
  onFocusout: FocusEvent;
  onBlur: FocusEvent;

  // form events
  onChange: any;
  onBeforeinput: any;
  onInput: any;
  onReset: any;
  onSubmit: any;
  onInvalid: any;

  // image events
  onLoad: any;
  onError: any;

  // keyboard events
  onKeydown: KeyboardEvent;
  onKeypress: KeyboardEvent;
  onKeyup: KeyboardEvent;

  // mouse events
  onAuxclick: MouseEvent;
  onClick: MouseEvent;
  onContextmenu: MouseEvent;
  onDblclick: MouseEvent;
  onMouseDown: MouseEvent;
  onMouseEnter: MouseEvent;
  onMouseLeave: MouseEvent;
  onMouseMove: MouseEvent;
  onMouseOut: MouseEvent;
  onMouseOver: MouseEvent;
  onMouseUp: MouseEvent;

  // media events
  onAbort: any;
  onCanplay: any;
  onCanplaythrough: any;
  onDurationchange: any;
  onEmptied: any;
  onEncrypted: any;
  onEnded: any;
  onLoadeddata: any;
  onLoadedmetadata: any;
  onLoadstart: any;
  onPause: any;
  onPlay: any;
  onPlaying: any;
  onProgress: any;
  onRatechange: any;
  onSeeked: any;
  onSeeking: any;
  onStalled: any;
  onSuspend: any;
  onTimeupdate: any;
  onVolumechange: any;
  onWaiting: any;

  // selection events
  onSelect: any;

  // UI events
  onScroll: UIEvent;

  // touch events
  onTouchcancel: TouchEvent;
  onTouchend: TouchEvent;
  onTouchmove: TouchEvent;
  onTouchstart: TouchEvent;

  // pointer events
  onPointerdown: PointerEvent;
  onPointermove: PointerEvent;
  onPointerup: PointerEvent;
  onPointercancel: PointerEvent;
  onPointerenter: PointerEvent;
  onPointerleave: PointerEvent;
  onPointerover: PointerEvent;
  onPointerout: PointerEvent;

  // wheel events
  onWheel: WheelEvent;

  // animation events
  onAnimationStart: AnimationEvent;
  onAnimationEnd: AnimationEvent;
  onAnimationIteration: AnimationEvent;

  // transition events
  onTransitionend: TransitionEvent;
  onTransitionstart: TransitionEvent;
}

type EventHandlers<E> = {
  [K in keyof E]?: E[K] extends Function ? E[K] : (payload: E[K]) => void;
};

type Booleanish = boolean | "true" | "false";

type Numberish = number | string;

export interface MyHTMLAttributes extends EventHandlers<Events> {
  [k: string]: any;
  // tarat-specific Attributes
  key?: any;
  autofocus?: any
  _html?: string;
  children?: any;
  name?: string;
  readOnly?: Booleanish;
  selected?: Booleanish;
  disabled?: Booleanish;
  if?: any; // boolean
  'value-path'?: Numberish | Numberish[]
  'checked-path'?: Numberish | Numberish[]

  type?: string

  className?: any;
  style?: CSSProperties;

  // Standard HTML Attributes
  accesskey?: string;
  contenteditable?: Booleanish | "inherit";
  contextmenu?: string;
  dir?: string;
  draggable?: Booleanish;
  hidden?: Booleanish;
  id?: string;
  lang?: string;
  placeholder?: string;
  spellcheck?: Booleanish;
  tabindex?: Numberish;
  title?: string;
  translate?: "yes" | "no";

  // Unknown
  radiogroup?: string; // <command>, <menuitem>

  // WAI-ARIA
  role?: string;

  // RDFa Attributes
  about?: string;
  datatype?: string;
  inlist?: any;
  prefix?: string;
  property?: string;
  resource?: string;
  typeof?: string;
  vocab?: string;

  // Non-standard Attributes
  autocapitalize?: string;
  autocorrect?: string;
  autocave?: string;
  color?: string;
  itemprop?: string;
  itemscope?: Booleanish;
  itemtype?: string;
  itemid?: string;
  itemref?: string;
  results?: Numberish;
  security?: string;
  unselectable?: "on" | "off";

  // Living Standard
  /**
   * Hints at the type of data that might be entered by the user while editing the element or its contents
   * @see https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute
   */
  inputmode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  /**
   * Specify that a standard HTML element should behave like a defined custom built-in element
   * @see https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
   */
  is?: string;
}

export interface AnchorMyHTMLAttributes extends MyHTMLAttributes {
  download?: any;
  href?: string;
  hreflang?: string;
  media?: string;
  ping?: string;
  rel?: string;
  target?: string;
  type?: string;
  referrerpolicy?: string;
}

export interface AreaMyHTMLAttributes extends MyHTMLAttributes {
  alt?: string;
  coords?: string;
  download?: any;
  href?: string;
  hreflang?: string;
  media?: string;
  rel?: string;
  shape?: string;
  target?: string;
}

export interface AudioMyHTMLAttributes extends MediaMyHTMLAttributes {}

export interface BaseMyHTMLAttributes extends MyHTMLAttributes {
  href?: string;
  target?: string;
}

export interface BlockquoteMyHTMLAttributes extends MyHTMLAttributes {
  cite?: string;
}

export interface ButtonMyHTMLAttributes extends MyHTMLAttributes {
  autofocus?: Booleanish;
  disabled?: Booleanish;
  form?: string;
  formaction?: string;
  formenctype?: string;
  formmethod?: string;
  formnovalidate?: Booleanish;
  formtarget?: string;
  name?: string;
  type?: "submit" | "reset" | "button";
  value?: string | string[] | number;
}

export interface CanvasMyHTMLAttributes extends MyHTMLAttributes {
  height?: Numberish;
  width?: Numberish;
}

export interface ColMyHTMLAttributes extends MyHTMLAttributes {
  span?: Numberish;
  width?: Numberish;
}

export interface ColgroupMyHTMLAttributes extends MyHTMLAttributes {
  span?: Numberish;
}

export interface DataMyHTMLAttributes extends MyHTMLAttributes {
  value?: string | string[] | number;
}

export interface DetailsMyHTMLAttributes extends MyHTMLAttributes {
  open?: Booleanish;
}

export interface DelMyHTMLAttributes extends MyHTMLAttributes {
  cite?: string;
  datetime?: string;
}

export interface DialogMyHTMLAttributes extends MyHTMLAttributes {
  open?: Booleanish;
}

export interface EmbedMyHTMLAttributes extends MyHTMLAttributes {
  height?: Numberish;
  src?: string;
  type?: string;
  width?: Numberish;
}

export interface FieldsetMyHTMLAttributes extends MyHTMLAttributes {
  disabled?: Booleanish;
  form?: string;
  name?: string;
}

export interface FormMyHTMLAttributes extends MyHTMLAttributes {
  acceptcharset?: string;
  action?: string;
  autocomplete?: string;
  enctype?: string;
  method?: string;
  name?: string;
  novalidate?: Booleanish;
  target?: string;
}

export interface HtmlMyHTMLAttributes extends MyHTMLAttributes {
  manifest?: string;
}

export interface IframeMyHTMLAttributes extends MyHTMLAttributes {
  allow?: string;
  allowfullscreen?: Booleanish;
  allowtransparency?: Booleanish;
  frameborder?: Numberish;
  height?: Numberish;
  marginheight?: Numberish;
  marginwidth?: Numberish;
  name?: string;
  referrerpolicy?: string;
  sandbox?: string;
  scrolling?: string;
  seamless?: Booleanish;
  src?: string;
  srcdoc?: string;
  width?: Numberish;
}

export interface ImgMyHTMLAttributes extends MyHTMLAttributes {
  alt?: string;
  crossorigin?: "anonymous" | "use-credentials" | "";
  decoding?: "async" | "auto" | "sync";
  height?: Numberish;
  sizes?: string;
  src?: string;
  srcset?: string;
  usemap?: string;
  width?: Numberish;
}

export interface InsMyHTMLAttributes extends MyHTMLAttributes {
  cite?: string;
  datetime?: string;
}

export interface InputMyHTMLAttributes extends MyHTMLAttributes {
  accept?: string;
  alt?: string;
  autocomplete?: string;
  autofocus?: Booleanish;
  autoFocus?: Booleanish;
  capture?: boolean | "user" | "environment"; // https://www.w3.org/tr/html-media-capture/#the-capture-attribute
  checked?: Booleanish;
  crossorigin?: string;
  disabled?: Booleanish;
  form?: string;
  formaction?: string;
  formenctype?: string;
  formmethod?: string;
  formnovalidate?: Booleanish;
  formtarget?: string;
  height?: Numberish;
  list?: string;
  max?: Numberish;
  maxlength?: Numberish;
  min?: Numberish;
  minlength?: Numberish;
  multiple?: Booleanish;
  name?: string;
  pattern?: string;
  placeholder?: string;
  readonly?: Booleanish;
  required?: Booleanish;
  size?: Numberish;
  src?: string;
  step?: Numberish;
  type?: string;
  value?:
    | string
    | ReadonlyArray<string>
    | number
    | undefined
    | StateSignal<number | string>
    | ComputedSignal<number | string>;
  width?: Numberish;
}

export interface KeygenMyHTMLAttributes extends MyHTMLAttributes {
  autofocus?: Booleanish;
  challenge?: string;
  disabled?: Booleanish;
  form?: string;
  keytype?: string;
  keyparams?: string;
  name?: string;
}

export interface LabelMyHTMLAttributes extends MyHTMLAttributes {
  for?: string;
  form?: string;
}

export interface LiMyHTMLAttributes extends MyHTMLAttributes {
  value?: string | string[] | number;
}

export interface LinkMyHTMLAttributes extends MyHTMLAttributes {
  as?: string;
  crossorigin?: string;
  href?: string;
  hreflang?: string;
  integrity?: string;
  media?: string;
  rel?: string;
  sizes?: string;
  type?: string;
}

export interface MapMyHTMLAttributes extends MyHTMLAttributes {
  name?: string;
}

export interface MenuMyHTMLAttributes extends MyHTMLAttributes {
  type?: string;
}

export interface MediaMyHTMLAttributes extends MyHTMLAttributes {
  autoplay?: Booleanish;
  controls?: Booleanish;
  controlslist?: string;
  crossorigin?: string;
  loop?: Booleanish;
  mediagroup?: string;
  muted?: Booleanish;
  playsinline?: Booleanish;
  preload?: string;
  src?: string;
}

export interface MetaMyHTMLAttributes extends MyHTMLAttributes {
  charset?: string;
  content?: string;
  httpequiv?: string;
  name?: string;
}

export interface MeterMyHTMLAttributes extends MyHTMLAttributes {
  form?: string;
  high?: Numberish;
  low?: Numberish;
  max?: Numberish;
  min?: Numberish;
  optimum?: Numberish;
  value?: string | string[] | number;
}

export interface QuoteMyHTMLAttributes extends MyHTMLAttributes {
  cite?: string;
}

export interface ObjectMyHTMLAttributes extends MyHTMLAttributes {
  classid?: string;
  data?: string;
  form?: string;
  height?: Numberish;
  name?: string;
  type?: string;
  usemap?: string;
  width?: Numberish;
  wmode?: string;
}

export interface OlMyHTMLAttributes extends MyHTMLAttributes {
  reversed?: Booleanish;
  start?: Numberish;
  type?: "1" | "a" | "A" | "i" | "I";
}

export interface OptgroupMyHTMLAttributes extends MyHTMLAttributes {
  disabled?: Booleanish;
  label?: string;
}

export interface OptionMyHTMLAttributes extends MyHTMLAttributes {
  disabled?: Booleanish;
  label?: string;
  selected?: Booleanish;
  value?: any; // we support :value to be bound to anything w/ v-model
}

export interface OutputMyHTMLAttributes extends MyHTMLAttributes {
  for?: string;
  form?: string;
  name?: string;
}

export interface ParamMyHTMLAttributes extends MyHTMLAttributes {
  name?: string;
  value?: string | string[] | number;
}

export interface ProgressMyHTMLAttributes extends MyHTMLAttributes {
  max?: Numberish;
  value?: string | string[] | number;
}

export interface ScriptMyHTMLAttributes extends MyHTMLAttributes {
  async?: Booleanish;
  charset?: string;
  crossorigin?: string;
  defer?: Booleanish;
  integrity?: string;
  nomodule?: Booleanish;
  nonce?: string;
  src?: string;
  type?: string;
}

export interface SelectMyHTMLAttributes extends MyHTMLAttributes {
  autocomplete?: string;
  autofocus?: Booleanish;
  disabled?: Booleanish;
  form?: string;
  multiple?: Booleanish;
  name?: string;
  required?: Booleanish;
  size?: Numberish;
  value?:
    | string
    | ReadonlyArray<string>
    | number
    | undefined
    | StateSignal<number | string>
    | ComputedSignal<number | string>;
}

export interface SourceMyHTMLAttributes extends MyHTMLAttributes {
  media?: string;
  sizes?: string;
  src?: string;
  srcset?: string;
  type?: string;
}

export interface StyleMyHTMLAttributes extends MyHTMLAttributes {
  media?: string;
  nonce?: string;
  scoped?: Booleanish;
  type?: string;
}

export interface TableMyHTMLAttributes extends MyHTMLAttributes {
  cellpadding?: Numberish;
  cellspacing?: Numberish;
  summary?: string;
}

export interface TextareaMyHTMLAttributes extends MyHTMLAttributes {
  autocomplete?: string;
  autofocus?: Booleanish;
  cols?: Numberish;
  dirname?: string;
  disabled?: Booleanish;
  form?: string;
  maxlength?: Numberish;
  minlength?: Numberish;
  name?: string;
  placeholder?: string;
  readonly?: boolean;
  required?: Booleanish;
  rows?: Numberish;
  value?:
    | string[]
    | string
    | ReadonlyArray<string>
    | number
    | undefined
    | StateSignal<number | string>
    | ComputedSignal<number | string>;
  wrap?: string;
}

export interface TdMyHTMLAttributes extends MyHTMLAttributes {
  align?: "left" | "center" | "right" | "justify" | "char";
  colspan?: Numberish;
  headers?: string;
  rowspan?: Numberish;
  scope?: string;
  valign?: "top" | "middle" | "bottom" | "baseline";
}

export interface ThMyHTMLAttributes extends MyHTMLAttributes {
  align?: "left" | "center" | "right" | "justify" | "char";
  colspan?: Numberish;
  headers?: string;
  rowspan?: Numberish;
  scope?: string;
}

export interface TimeMyHTMLAttributes extends MyHTMLAttributes {
  datetime?: string;
}

export interface TrackMyHTMLAttributes extends MyHTMLAttributes {
  default?: Booleanish;
  kind?: string;
  label?: string;
  src?: string;
  srclang?: string;
}

export interface VideoMyHTMLAttributes extends MediaMyHTMLAttributes {
  height?: Numberish;
  playsinline?: Booleanish;
  poster?: string;
  width?: Numberish;
  disablePictureInPicture?: Booleanish;
}

export interface WebViewMyHTMLAttributes extends MyHTMLAttributes {
  allowfullscreen?: Booleanish;
  allowpopups?: Booleanish;
  autoFocus?: Booleanish;
  autosize?: Booleanish;
  blinkfeatures?: string;
  disableblinkfeatures?: string;
  disableguestresize?: Booleanish;
  disablewebsecurity?: Booleanish;
  guestinstance?: string;
  httpreferrer?: string;
  nodeintegration?: Booleanish;
  partition?: string;
  plugins?: Booleanish;
  preload?: string;
  src?: string;
  useragent?: string;
  webpreferences?: string;
}

export interface SVGAttributes extends EventHandlers<Events> {
  key?: any;
  _html?: string;
  children?: any;
  readOnly?: Booleanish;
  selected?: Booleanish;
  disabled?: Booleanish;
  /**
   * SVG Styling Attributes
   * @see https://www.w3.org/TR/SVG/styling.html#ElementSpecificStyling
   */
  className?: any;
  style?: CSSProperties;

  color?: string;
  height?: Numberish;
  id?: string;
  lang?: string;
  max?: Numberish;
  media?: string;
  method?: string;
  min?: Numberish;
  name?: string;
  target?: string;
  type?: string;
  width?: Numberish;

  // Other HTML properties supported by SVG elements in browsers
  role?: string;
  tabindex?: Numberish;

  // SVG Specific attributes
  "accent-height"?: Numberish;
  accumulate?: "none" | "sum";
  additive?: "replace" | "sum";
  "alignment-baseline"?:
    | "auto"
    | "baseline"
    | "before-edge"
    | "text-before-edge"
    | "middle"
    | "central"
    | "after-edge"
    | "text-after-edge"
    | "ideographic"
    | "alphabetic"
    | "hanging"
    | "mathematical"
    | "inherit";
  allowReorder?: "no" | "yes";
  alphabetic?: Numberish;
  amplitude?: Numberish;
  "arabic-form"?: "initial" | "medial" | "terminal" | "isolated";
  ascent?: Numberish;
  attributeName?: string;
  attributeType?: string;
  autoReverse?: Numberish;
  azimuth?: Numberish;
  baseFrequency?: Numberish;
  "baseline-shift"?: Numberish;
  baseProfile?: Numberish;
  bbox?: Numberish;
  begin?: Numberish;
  bias?: Numberish;
  by?: Numberish;
  calcMode?: Numberish;
  "cap-height"?: Numberish;
  clip?: Numberish;
  "clip-path"?: string;
  clipPathUnits?: Numberish;
  "clip-rule"?: Numberish;
  "color-interpolation"?: Numberish;
  "color-interpolation-filters"?: "auto" | "sRGB" | "linearRGB" | "inherit";
  "color-profile"?: Numberish;
  "color-rendering"?: Numberish;
  contentScriptType?: Numberish;
  contentStyleType?: Numberish;
  cursor?: Numberish;
  cx?: Numberish;
  cy?: Numberish;
  d?: string;
  decelerate?: Numberish;
  descent?: Numberish;
  diffuseConstant?: Numberish;
  direction?: Numberish;
  display?: Numberish;
  divisor?: Numberish;
  "dominant-baseline"?: Numberish;
  dur?: Numberish;
  dx?: Numberish;
  dy?: Numberish;
  edgeMode?: Numberish;
  elevation?: Numberish;
  "enable-background"?: Numberish;
  end?: Numberish;
  exponent?: Numberish;
  externalResourcesRequired?: Numberish;
  fill?: string;
  "fill-opacity"?: Numberish;
  "fill-rule"?: "nonzero" | "evenodd" | "inherit";
  filter?: string;
  filterRes?: Numberish;
  filterUnits?: Numberish;
  "flood-color"?: Numberish;
  "flood-opacity"?: Numberish;
  focusable?: Numberish;
  "font-family"?: string;
  "font-size"?: Numberish;
  "font-size-adjust"?: Numberish;
  "font-stretch"?: Numberish;
  "font-style"?: Numberish;
  "font-variant"?: Numberish;
  "font-weight"?: Numberish;
  format?: Numberish;
  from?: Numberish;
  fx?: Numberish;
  fy?: Numberish;
  g1?: Numberish;
  g2?: Numberish;
  "glyph-name"?: Numberish;
  "glyph-orientation-horizontal"?: Numberish;
  "glyph-orientation-vertical"?: Numberish;
  glyphRef?: Numberish;
  gradientTransform?: string;
  gradientUnits?: string;
  hanging?: Numberish;
  "horiz-adv-x"?: Numberish;
  "horiz-origin-x"?: Numberish;
  href?: string;
  ideographic?: Numberish;
  "image-rendering"?: Numberish;
  in2?: Numberish;
  in?: string;
  intercept?: Numberish;
  k1?: Numberish;
  k2?: Numberish;
  k3?: Numberish;
  k4?: Numberish;
  k?: Numberish;
  kernelMatrix?: Numberish;
  kernelUnitLength?: Numberish;
  kerning?: Numberish;
  keyPoints?: Numberish;
  keySplines?: Numberish;
  keyTimes?: Numberish;
  lengthAdjust?: Numberish;
  "letter-spacing"?: Numberish;
  "lighting-color"?: Numberish;
  limitingConeAngle?: Numberish;
  local?: Numberish;
  "marker-end"?: string;
  markerHeight?: Numberish;
  "marker-mid"?: string;
  "marker-start"?: string;
  markerUnits?: Numberish;
  markerWidth?: Numberish;
  mask?: string;
  maskContentUnits?: Numberish;
  maskUnits?: Numberish;
  mathematical?: Numberish;
  mode?: Numberish;
  numOctaves?: Numberish;
  offset?: Numberish;
  opacity?: Numberish;
  operator?: Numberish;
  order?: Numberish;
  orient?: Numberish;
  orientation?: Numberish;
  origin?: Numberish;
  overflow?: Numberish;
  "overline-position"?: Numberish;
  "overline-thickness"?: Numberish;
  "paint-order"?: Numberish;
  "panose-1"?: Numberish;
  pathLength?: Numberish;
  patternContentUnits?: string;
  patternTransform?: Numberish;
  patternUnits?: string;
  "pointer-events"?: Numberish;
  points?: string;
  pointsAtX?: Numberish;
  pointsAtY?: Numberish;
  pointsAtZ?: Numberish;
  preserveAlpha?: Numberish;
  preserveAspectRatio?: string;
  primitiveUnits?: Numberish;
  r?: Numberish;
  radius?: Numberish;
  refX?: Numberish;
  refY?: Numberish;
  renderingIntent?: Numberish;
  repeatCount?: Numberish;
  repeatDur?: Numberish;
  requiredExtensions?: Numberish;
  requiredFeatures?: Numberish;
  restart?: Numberish;
  result?: string;
  rotate?: Numberish;
  rx?: Numberish;
  ry?: Numberish;
  scale?: Numberish;
  seed?: Numberish;
  "shape-rendering"?: Numberish;
  slope?: Numberish;
  spacing?: Numberish;
  specularConstant?: Numberish;
  specularExponent?: Numberish;
  speed?: Numberish;
  spreadMethod?: string;
  startOffset?: Numberish;
  stdDeviation?: Numberish;
  stemh?: Numberish;
  stemv?: Numberish;
  stitchTiles?: Numberish;
  "stop-color"?: string;
  "stop-opacity"?: Numberish;
  "strikethrough-position"?: Numberish;
  "strikethrough-thickness"?: Numberish;
  string?: Numberish;
  stroke?: string;
  "stroke-dasharray"?: Numberish;
  "stroke-dashoffset"?: Numberish;
  "stroke-linecap"?: "butt" | "round" | "square" | "inherit";
  "stroke-linejoin"?: "miter" | "round" | "bevel" | "inherit";
  "stroke-miterlimit"?: Numberish;
  "stroke-opacity"?: Numberish;
  "stroke-width"?: Numberish;
  surfaceScale?: Numberish;
  systemLanguage?: Numberish;
  tableValues?: Numberish;
  targetX?: Numberish;
  targetY?: Numberish;
  "text-anchor"?: string;
  "text-decoration"?: Numberish;
  textLength?: Numberish;
  "text-rendering"?: Numberish;
  to?: Numberish;
  transform?: string;
  u1?: Numberish;
  u2?: Numberish;
  "underline-position"?: Numberish;
  "underline-thickness"?: Numberish;
  unicode?: Numberish;
  "unicode-bidi"?: Numberish;
  "unicode-range"?: Numberish;
  "unitsPer-em"?: Numberish;
  "v-alphabetic"?: Numberish;
  values?: string;
  "vector-effect"?: Numberish;
  version?: string;
  "vert-adv-y"?: Numberish;
  "vert-origin-x"?: Numberish;
  "vert-origin-y"?: Numberish;
  "v-hanging"?: Numberish;
  "v-ideographic"?: Numberish;
  viewBox?: string;
  viewTarget?: Numberish;
  visibility?: Numberish;
  "v-mathematical"?: Numberish;
  widths?: Numberish;
  "word-spacing"?: Numberish;
  "writing-mode"?: Numberish;
  x1?: Numberish;
  x2?: Numberish;
  x?: Numberish;
  xChannelSelector?: string;
  "x-height"?: Numberish;
  xlinkActuate?: string;
  xlinkArcrole?: string;
  xlinkHref?: string;
  xlinkRole?: string;
  xlinkShow?: string;
  xlinkTitle?: string;
  xlinkType?: string;
  xmlns?: string;
  y1?: Numberish;
  y2?: Numberish;
  y?: Numberish;
  yChannelSelector?: string;
  z?: Numberish;
  zoomAndPan?: string;
}

interface IntrinsicElementAttributes {
  a: AnchorMyHTMLAttributes;
  abbr: MyHTMLAttributes;
  address: MyHTMLAttributes;
  area: AreaMyHTMLAttributes;
  article: MyHTMLAttributes;
  aside: MyHTMLAttributes;
  audio: AudioMyHTMLAttributes;
  b: MyHTMLAttributes;
  base: BaseMyHTMLAttributes;
  bdi: MyHTMLAttributes;
  bdo: MyHTMLAttributes;
  blockquote: BlockquoteMyHTMLAttributes;
  body: MyHTMLAttributes;
  br: MyHTMLAttributes;
  button: ButtonMyHTMLAttributes;
  canvas: CanvasMyHTMLAttributes;
  caption: MyHTMLAttributes;
  cite: MyHTMLAttributes;
  code: MyHTMLAttributes;
  col: ColMyHTMLAttributes;
  colgroup: ColgroupMyHTMLAttributes;
  data: DataMyHTMLAttributes;
  datalist: MyHTMLAttributes;
  dd: MyHTMLAttributes;
  del: DelMyHTMLAttributes;
  details: DetailsMyHTMLAttributes;
  dfn: MyHTMLAttributes;
  dialog: DialogMyHTMLAttributes;
  div: MyHTMLAttributes;
  dl: MyHTMLAttributes;
  dt: MyHTMLAttributes;
  em: MyHTMLAttributes;
  embed: EmbedMyHTMLAttributes;
  fieldset: FieldsetMyHTMLAttributes;
  figcaption: MyHTMLAttributes;
  figure: MyHTMLAttributes;
  footer: MyHTMLAttributes;
  form: FormMyHTMLAttributes;
  h1: MyHTMLAttributes;
  h2: MyHTMLAttributes;
  h3: MyHTMLAttributes;
  h4: MyHTMLAttributes;
  h5: MyHTMLAttributes;
  h6: MyHTMLAttributes;
  head: MyHTMLAttributes;
  header: MyHTMLAttributes;
  hgroup: MyHTMLAttributes;
  hr: MyHTMLAttributes;
  html: HtmlMyHTMLAttributes;
  i: MyHTMLAttributes;
  iframe: IframeMyHTMLAttributes;
  img: ImgMyHTMLAttributes;
  input: InputMyHTMLAttributes;
  ins: InsMyHTMLAttributes;
  kbd: MyHTMLAttributes;
  keygen: KeygenMyHTMLAttributes;
  label: LabelMyHTMLAttributes;
  legend: MyHTMLAttributes;
  li: LiMyHTMLAttributes;
  link: LinkMyHTMLAttributes;
  main: MyHTMLAttributes;
  map: MapMyHTMLAttributes;
  mark: MyHTMLAttributes;
  menu: MenuMyHTMLAttributes;
  meta: MetaMyHTMLAttributes;
  meter: MeterMyHTMLAttributes;
  nav: MyHTMLAttributes;
  noindex: MyHTMLAttributes;
  noscript: MyHTMLAttributes;
  object: ObjectMyHTMLAttributes;
  ol: OlMyHTMLAttributes;
  optgroup: OptgroupMyHTMLAttributes;
  option: OptionMyHTMLAttributes;
  output: OutputMyHTMLAttributes;
  p: MyHTMLAttributes;
  param: ParamMyHTMLAttributes;
  picture: MyHTMLAttributes;
  pre: MyHTMLAttributes;
  progress: ProgressMyHTMLAttributes;
  q: QuoteMyHTMLAttributes;
  rp: MyHTMLAttributes;
  rt: MyHTMLAttributes;
  ruby: MyHTMLAttributes;
  s: MyHTMLAttributes;
  samp: MyHTMLAttributes;
  script: ScriptMyHTMLAttributes;
  section: MyHTMLAttributes;
  select: SelectMyHTMLAttributes;
  small: MyHTMLAttributes;
  source: SourceMyHTMLAttributes;
  span: MyHTMLAttributes;
  strong: MyHTMLAttributes;
  style: StyleMyHTMLAttributes;
  sub: MyHTMLAttributes;
  summary: MyHTMLAttributes;
  sup: MyHTMLAttributes;
  table: TableMyHTMLAttributes;
  template: MyHTMLAttributes;
  tbody: MyHTMLAttributes;
  td: TdMyHTMLAttributes;
  textarea: TextareaMyHTMLAttributes;
  tfoot: MyHTMLAttributes;
  th: ThMyHTMLAttributes;
  thead: MyHTMLAttributes;
  time: TimeMyHTMLAttributes;
  title: MyHTMLAttributes;
  tr: MyHTMLAttributes;
  track: TrackMyHTMLAttributes;
  u: MyHTMLAttributes;
  ul: MyHTMLAttributes;
  var: MyHTMLAttributes;
  video: VideoMyHTMLAttributes;
  wbr: MyHTMLAttributes;
  webview: WebViewMyHTMLAttributes;

  // SVG
  svg: SVGAttributes;

  animate: SVGAttributes;
  animateMotion: SVGAttributes;
  animateTransform: SVGAttributes;
  circle: SVGAttributes;
  clipPath: SVGAttributes;
  defs: SVGAttributes;
  desc: SVGAttributes;
  ellipse: SVGAttributes;
  feBlend: SVGAttributes;
  feColorMatrix: SVGAttributes;
  feComponentTransfer: SVGAttributes;
  feComposite: SVGAttributes;
  feConvolveMatrix: SVGAttributes;
  feDiffuseLighting: SVGAttributes;
  feDisplacementMap: SVGAttributes;
  feDistantLight: SVGAttributes;
  feDropShadow: SVGAttributes;
  feFlood: SVGAttributes;
  feFuncA: SVGAttributes;
  feFuncB: SVGAttributes;
  feFuncG: SVGAttributes;
  feFuncR: SVGAttributes;
  feGaussianBlur: SVGAttributes;
  feImage: SVGAttributes;
  feMerge: SVGAttributes;
  feMergeNode: SVGAttributes;
  feMorphology: SVGAttributes;
  feOffset: SVGAttributes;
  fePointLight: SVGAttributes;
  feSpecularLighting: SVGAttributes;
  feSpotLight: SVGAttributes;
  feTile: SVGAttributes;
  feTurbulence: SVGAttributes;
  filter: SVGAttributes;
  foreignObject: SVGAttributes;
  g: SVGAttributes;
  image: SVGAttributes;
  line: SVGAttributes;
  linearGradient: SVGAttributes;
  marker: SVGAttributes;
  mask: SVGAttributes;
  metadata: SVGAttributes;
  mpath: SVGAttributes;
  path: SVGAttributes;
  pattern: SVGAttributes;
  polygon: SVGAttributes;
  polyline: SVGAttributes;
  radialGradient: SVGAttributes;
  rect: SVGAttributes;
  stop: SVGAttributes;
  switch: SVGAttributes;
  symbol: SVGAttributes;
  text: SVGAttributes;
  textPath: SVGAttributes;
  tspan: SVGAttributes;
  use: SVGAttributes;
  view: SVGAttributes;
}

type NativeElements = {
  [K in keyof IntrinsicElementAttributes]: IntrinsicElementAttributes[K];
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: MyHTMLAttributes;
    }

    // interface IntrinsicAttributes {
    //   _html?: string
    // }
    // interface IntrinsicClassAttributes<T> {
    //   _html?: string
    // }

    // interface Element<T extends string | Function> extends VLayoutNode<T> {
    //   type: T;
    // }
    type ElementType = string | FunctionComponent<any>
    interface Element extends VirtualLayoutJSON {}
  }
}
export {};
