struct VertexOutput {  // type for return value of vertex shader
   @builtin(position) position: vec4f,
   @location(0) uv: vec2f
};

struct DiskInfo {
    offset : vec2f,  // translation applied to the disk
    color : vec2f  // interior color for the disk
};

struct ProjectViewMatrix {
    viewMatrix : mat4x4f,
    projectionMatrix : mat4x4f,
    cameraPosition : vec3f
}

@group(0) @binding(0) var<uniform> modelMatrix: mat4x4f;
@group(0) @binding(1) var<uniform> viewProjectionMatrix: ProjectViewMatrix;
@group(1) @binding(0) var tex : texture_2d<f32>;
@group(1) @binding(1) var samp : sampler;

@vertex
fn vertexMain( 
          @location(0) coords : vec3f,
          @location(1) uv : vec2f
       ) -> VertexOutput {

   let eyeCoords = vec4f(coords, 1);
   var output : VertexOutput;
    output.position = viewProjectionMatrix.projectionMatrix * viewProjectionMatrix.viewMatrix * modelMatrix * eyeCoords;
    output.uv = uv;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let textureColor = textureSample (tex, samp, input.uv);
    return textureColor;
}
