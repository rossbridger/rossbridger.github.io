struct VertexOutput {  // type for return value of vertex shader
   @builtin(position) position: vec4f,
   @location(0) uv: vec2f
};

struct DiskInfo {
    offset : vec2f,  // translation applied to the disk
    color : vec2f  // interior color for the disk
};

@group(0) @binding(0) var<uniform> viewProjectionMatrix: mat4x4f;
@group(1) @binding(0) var tex : texture_2d<f32>;
@group(1) @binding(1) var samp : sampler;

@vertex
fn vertexMain( 
          @location(0) coords : vec3f,
          @location(1) uv : vec2f
       ) -> VertexOutput {

   let eyeCoords = vec4f(coords, 1);
   var output : VertexOutput;
    output.position = viewProjectionMatrix * eyeCoords;
    output.uv = uv;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let textureColor = textureSample (tex, samp, input.uv);
    return textureColor;
}
