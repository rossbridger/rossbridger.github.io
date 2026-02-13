"use strict";

const vertexData = new Float32Array([
    /* coords */     /* color */
    -0.8, -0.6, 1, 0, 0,      // data for first vertex
    0.8, -0.6, 0, 1, 0,      // data for second vertex
    0.0, 0.7, 0, 0, 1       // data for third vertex
]);

const indexData = new Uint32Array([
    0, 1, 2
]);

async function initWebGPU() {

    if (!navigator.gpu) {
        throw Error("WebGPU not supported in this browser.");
    }
    let adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw Error("WebGPU is supported, but couldn't get WebGPU adapter.");
    }

    let device = await adapter.requestDevice();
    let canvas = document.getElementById("canvas");
    let context = canvas.getContext("webgpu");
    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied" // (the alternative is "opaque")
    });

    // Create a shader module from the shader code.
    let shaderModule = device.createShaderModule({ code: shader });

    let vertexBufferLayout = [
        {   // One vertex buffer, containing values for two attributes.
            attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x2" },
                { shaderLocation: 1, offset: 8, format: "float32x3" }
            ],
            arrayStride: 20,
            stepMode: "vertex"
        }
    ];

    let uniformBindGroupLayout = device.createBindGroupLayout({
        entries: [ // An array of resource specifications.
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform"
                }
            }
        ]
    });

    let pipelineDescriptor = {
        vertex: { // Configuration for the vertex shader.
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: vertexBufferLayout
        },
        fragment: { // Configuration for the fragment shader.
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat()
            }]
        },
        primitive: {
            topology: "triangle-list"
        },
        layout: device.createPipelineLayout({
            bindGroupLayouts: [uniformBindGroupLayout]
        }),
        multisample: {  // Sets number of samples for multisampling.
            count: 4,     //  (1 and 4 are currently the only possible values).
        },
    };

    let pipeline = device.createRenderPipeline(pipelineDescriptor);

    let pipelineDescriptorForOutline = {
        vertex: { // Configuration for the vertex shader.
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: vertexBufferLayout
        },
        fragment: { // Configuration for the fragment shader.
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat()
            }]
        },
        primitive: {
            topology: "line-strip"
        },
        layout: device.createPipelineLayout({
            bindGroupLayouts: [uniformBindGroupLayout]
        }),
        multisample: {  // Sets number of samples for multisampling.
            count: 4,     //  (1 and 4 are currently the only possible values).
        },
    };
    let pipelineForOutline = device.createRenderPipeline(pipelineDescriptorForOutline);

    // build vertex and uniform buffer
    let vertexBuffer = device.createBuffer({
        size: vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    let indexBuffer = device.createBuffer({
        size: indexData.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    let uniformBuffer = device.createBuffer({
        size: 3 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    let uniformBindGroup = device.createBindGroup({
        layout: uniformBindGroupLayout,
        entries: [
            {
                binding: 0, // Corresponds to the binding 0 in the layout.
                resource: { buffer: uniformBuffer, offset: 0, size: 3 * 4 }
            }
        ]
    });

    device.queue.writeBuffer(vertexBuffer, 0, vertexData);
    device.queue.writeBuffer(indexBuffer, 0, indexData);

    let textureForMultisampling = device.createTexture({
        size: [context.canvas.width, context.canvas.height],
        sampleCount: 4,  // (1 and 4 are currently the only possible values.)
        format: navigator.gpu.getPreferredCanvasFormat(),
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    let textureViewForMultisampling = textureForMultisampling.createView();

    // drawing
    let commandEncoder = device.createCommandEncoder();
    let renderPassDescriptor = {
        colorAttachments: [{
            clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1 },  // gray background
            loadOp: "clear", // Alternative is "load".
            storeOp: "store",  // Alternative is "discard".
            view: textureViewForMultisampling, // Render to multisampling texture.
            resolveTarget: context.getCurrentTexture().createView() // Final image.
        }]
    };

    let passEncoder;
    renderPassDescriptor.colorAttachments[0].loadOp = "clear";
    passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);            // Specify pipeline.
    passEncoder.setVertexBuffer(0, vertexBuffer);  // Attach vertex buffer.
    passEncoder.setVertexBuffer(1, vertexBuffer);  // Attach vertex buffer.
    passEncoder.setIndexBuffer(indexBuffer, "uint32");
    passEncoder.setBindGroup(0, uniformBindGroup); // Attach bind group.
    passEncoder.drawIndexed(3);                          // Generate vertices.
    passEncoder.end();

    /* Second render pass draws the outline, using a "line-strip" topology. */
    renderPassDescriptor.colorAttachments[0].loadOp = "load"; // DON'T clear!
    passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipelineForOutline); // uses "line-strip"
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.setVertexBuffer(1, vertexBuffer);  // Attach vertex buffer.
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(3);
    passEncoder.end();

    let commandBuffer = commandEncoder.finish();
    device.queue.submit([commandBuffer]);
}

window.addEventListener("load", async () => {
    await initWebGPU();
});
