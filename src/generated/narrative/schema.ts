/** Public geometry only. Generated modules never include authoring paths or reference documents. */
export type VectorTuple = readonly [number, number, number];
export type ArtScene = 'hero' | 'company' | 'products' | 'technology';
export interface AuthoredCamera { readonly position: VectorTuple; readonly target: VectorTuple; readonly orthographicScale: number }
export interface AuthoredMaterial { readonly id: string; readonly color: string; readonly metalness: number; readonly roughness: number }
export interface EncodedObject {
  readonly name: string;
  readonly material: string;
  readonly role: 'body' | 'gate' | 'marker' | 'cover' | 'ground';
  readonly pivot: VectorTuple;
  readonly positionMin: VectorTuple;
  readonly positionSize: VectorTuple;
  readonly positions: string;
  readonly normals: string;
  readonly indices: string;
  readonly index32: boolean;
  readonly motion?: { readonly axis: VectorTuple; readonly distance: number; readonly group?: number };
  readonly path?: readonly VectorTuple[];
}
export interface EncodedAuthoredScene {
  readonly scene: ArtScene;
  readonly camera: AuthoredCamera;
  readonly materials: readonly AuthoredMaterial[];
  readonly objects: readonly EncodedObject[];
  readonly bounds: { readonly min: VectorTuple; readonly max: VectorTuple };
  readonly triangles: number;
}
