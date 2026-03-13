struct VertexOutput {  // type for return value of vertex shader
   @builtin(position) position: vec4f,
   @location(0) uv: vec2f
};

struct DiskInfo {
    offset : vec2f,  // translation applied to the disk
    color : vec2f  // interior color for the disk
};

struct UniformData {
    modelview : mat4x4f,   // size 16, offset 0  
    projection : mat4x4f,  // size 16, offset 16 (measured in 4-byte floats)
};

@group(0) @binding(0) var<uniform> uniformData: UniformData;
@group(1) @binding(0) var tex : texture_2d<f32>;
@group(1) @binding(1) var samp : sampler;

@vertex
fn vertexMain( 
          @location(0) coords : vec3f,
          @location(1) uv : vec2f
       ) -> VertexOutput {

   let eyeCoords = uniformData.modelview * vec4f(coords, 1);
   var output : VertexOutput;
    output.position = uniformData.projection * eyeCoords;
    output.uv = uv;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let textureColor = textureSample (tex, samp, input.uv);
    return textureColor;
}
