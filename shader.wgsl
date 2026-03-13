struct VertexOutput {  // type for return value of vertex shader
   @builtin(position) position: vec4f,
   @location(0) eyeCoords: vec3f,
   @location(1) color: vec4f
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

@group(0) @binding(1) var<storage, read> diskInfo: array<DiskInfo>;

@vertex
fn vertexMain( 
          @location(0) coords : vec2f,
          @builtin(instance_index) instance : u32
       ) -> VertexOutput {

   let eyeCoords = uniformData.modelview * vec4f(coords + diskInfo[instance].offset, 0, 1);
   var output : VertexOutput; // (A struct with position and color fields.)
    output.position = uniformData.projection * eyeCoords;
    output.eyeCoords = eyeCoords.xyz/eyeCoords.w;  // convert to (x,y,z) coords
    output.color = vec4f(diskInfo[instance].color, 0, 1);
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
   return input.color;
}
