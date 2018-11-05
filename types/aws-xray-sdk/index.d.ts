type AWS = typeof AWS;

declare module 'aws-xray-sdk' {
  export function captureAWS(aws: AWS): AWS;
  export function captureHTTPsGlobal(module: any, downstreamXRayEnabled?: boolean): void;
  export function capturePromise(): void;
}
