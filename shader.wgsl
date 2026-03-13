struct VertexOutput {  // type for return value of vertex shader
   @builtin(position) position: vec4f,
   @location(0) color : vec4f
};

struct DiskInfo {
    offset : vec2f,  // translation applied to the disk
    color : vec2f  // interior color for the disk
};

@group(0) @binding(0) var<storage, read> diskInfo: array<DiskInfo>;

@vertex
fn vertexMain( 
          @location(0) coords : vec2f,
          @builtin(instance_index) instance : u32
       ) -> VertexOutput {
   var output : VertexOutput; // (A struct with position and color fields.)
   output.position = vec4f(coords + diskInfo[instance].offset, 0, 1);
   output.color = vec4f(diskInfo[instance].color, 0, 1);
   return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
   return input.color;
}
