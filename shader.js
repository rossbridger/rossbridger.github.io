const shader = `
struct VertexOutput {  // type for return value of vertex shader
   @builtin(position) position: vec4f,
   @location(0) color : vec3f  
}

@vertex
fn vertexMain(
         @builtin(vertex_index) vertexNumInPoint: u32,
         @builtin(instance_index) pointNum: u32,
         @location(0) coords : vec2f, 
         @location(1) color : vec3f  
      ) -> VertexOutput {  
   var output: VertexOutput;  
   output.position = vec4f( coords, 0, 1 );
   output.color = color;
   return output;
}

@fragment
fn fragmentMain(@location(0) fragColor : vec3f) -> @location(0) vec4f {
   return vec4f(fragColor,1);
}
`;
