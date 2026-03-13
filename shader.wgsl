struct VertexOutput {  // type for return value of vertex shader
   @builtin(position) position: vec4f,
   @location(0) color : vec4f
}

@vertex
fn vertexMain( 
          @location(0) coords : vec2f,
          @location(1) offset : vec2f,
          @location(2) color : vec3f
       ) -> VertexOutput {
   var output : VertexOutput; // (A struct with position and color fields.)
   output.position = vec4f(coords + offset, 0, 1);
   output.color = vec4f(color, 1);
   return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
   return input.color;
}
