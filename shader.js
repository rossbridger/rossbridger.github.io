const shader = `
   
   @group(0) @binding(0) var<uniform> color : vec3f;

   @vertex
   fn vertexMain( @location(0) coords : vec2f ) -> @builtin(position) vec4f {
      return vec4f( coords, 0, 1 );
   }
   
   @fragment
   fn fragmentMain() -> @location(0) vec4f {
      return vec4f( color, 1 ); 
   }
`;
