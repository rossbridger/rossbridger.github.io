
struct VertexOutput {  // type for return value of vertex shader
   @builtin(position) position: vec4f,
   @location(0) color : vec3f  
}

@group(0) @binding(0) var<uniform> view : mat4x4<f32>;
@group(0) @binding(1) var<uniform> projection : mat4x4<f32>;

@vertex
fn vertexMain(
         @builtin(vertex_index) vertexNumInPoint: u32,
         @builtin(instance_index) pointNum: u32,
         @location(0) coords : vec2f, 
         @location(1) color : vec3f  
      ) -> VertexOutput {  
   var output: VertexOutput;
   output.position = projection * view * vec4f( coords, 1, 1 );
   output.color = color;
   return output;
}

@fragment
fn fragmentMain(@location(0) fragColor : vec3f) -> @location(0) vec4f {
   return vec4f(fragColor,1);
}
