window.addEventListener('load', function () {
    // получить элемент canvas и его контекст
    let canvas = document.getElementById('sketchpad'),
        context = canvas.getContext('2d'),
        canvasOffset = getOffsetSum(canvas),
        thumbnailCtx = document.getElementById('thumbnail').getContext("2d"),
        footprint = {
            width: 28,
            height: 28
        },
        isRecognized = false,
        zoom = 10,
        clearer = function clearer() {
            context.fillStyle = "white";
            context.fillRect(0, 0, footprint.width * zoom, footprint.height * zoom);
            thumbnailCtx.fillStyle = "white";
            thumbnailCtx.fillRect(0, 0, footprint.width, footprint.height);
            document.getElementById('result').innerText = '';
            isRecognized = false;
        };

    clearer();

    function getOffsetSum(elem) {
        let top = 0, left = 0;
        while (elem) {
            top = top + parseInt(elem.offsetTop);
            left = left + parseInt(elem.offsetLeft);
            elem = elem.offsetParent
        }

        return {top: top, left: left}
    }

    // создаем ящик, который отслеживает движения касания
    let drawer = {
        isDrawing: false,
        touchstart: function (coors) {
            context.beginPath();
            context.lineWidth = 20;
            context.lineCap = "round";
            context.moveTo(coors.x - canvasOffset.left, coors.y - canvasOffset.top);
            this.isDrawing = true;
        },
        touchmove: function (coors) {
            if (this.isDrawing) {
                if (isRecognized) {
                    clearer();
                }
                context.lineTo(coors.x - canvasOffset.left, coors.y - canvasOffset.top);
                context.stroke();
            }
        },
        touchend: function (coors) {
            if (this.isDrawing) {
                this.touchmove(coors);
                this.isDrawing = false;
            }
        }
    };

    // создаем функцию для передачи событий касания и координат в ящик
    function draw(event) {
        let type = null;
        // отображать события мыши, чтобы коснуться событий
        switch (event.type) {
            case "mousedown":
                event.touches = [];
                event.touches[0] = {
                    pageX: event.pageX,
                    pageY: event.pageY
                };
                type = "touchstart";
                break;
            case "mousemove":
                event.touches = [];
                event.touches[0] = {
                    pageX: event.pageX,
                    pageY: event.pageY
                };
                type = "touchmove";
                break;
            case "mouseup":
                event.touches = [];
                event.touches[0] = {
                    pageX: event.pageX,
                    pageY: event.pageY
                };
                type = "touchend";
                break;
        }
// коснитесь штрихов [0], поэтому нам нужно использовать changedTouches [0]
        let coors;
        if (event.type === "touchend") {
            coors = {
                x: event.changedTouches[0].pageX,
                y: event.changedTouches[0].pageY
            };
        }
        else {
            // get the touch coordinates
            coors = {
                x: event.touches[0].pageX,
                y: event.touches[0].pageY
            };
        }
        type = type || event.type;
        // передаем координаты соответствующему обработчику
        drawer[type](coors);
    }

    // обнаружение сенсорных возможностей
    let touchAvailable = ('createTouch' in document) || ('ontouchstart' in window);

    // прикрепляем touchstart, touchmove, touchhend прослушиватели событий.
    if (touchAvailable) {
        canvas.addEventListener('touchstart', draw, false);
        canvas.addEventListener('touchmove', draw, false);
        canvas.addEventListener('touchend', draw, false);
    }
    // присоединяем прослушиватели событий mousedown, mousemove, mouseup.
    else {
        canvas.addEventListener('mousedown', draw, false);
        canvas.addEventListener('mousemove', draw, false);
        canvas.addEventListener('mouseup', draw, false);
    }

    window.addEventListener("resize", function (event) {
        event.preventDefault();
        canvasOffset = getOffsetSum(canvas);
    }, false);

    // предотвращаем прокрутку
    document.body.addEventListener('touchmove', function (event) {
        event.preventDefault();
    }, false); // end body.onTouchMove

    // Очистить холст
    document.getElementById('sketchClearButton').addEventListener('click', function (event) {
        event.preventDefault();
        clearer();
    }, false);

    // Функция распознавания номера
    document.getElementById('sketchRecogniseButton').addEventListener('click', function (event) {
        event.preventDefault();
        if (isRecognized) return;

        let imgData = context.getImageData(0, 0, 280, 280),
            imgUtil = window["imgUtil"];

        grayscaleImg = imgUtil.imageDataToGrayscale(imgData);
        let boundingRectangle = imgUtil.getBoundingRectangle(grayscaleImg, 0.01);
        let trans = imgUtil.centerImage(grayscaleImg); // [dX, dY] to center of mass

        //console.log(grayscaleImg);
        //console.log(boundingRectangle);
        //console.log(trans);

        // копируем изображение на скрытый холст, переводим в центр масс, затем
        // масштабируем, чтобы вписаться в коробку 200x200
        let canvasCopy = document.createElement("canvas");
        canvasCopy.width = imgData.width;
        canvasCopy.height = imgData.height;
        let copyCtx = canvasCopy.getContext("2d");
        let brW = boundingRectangle.maxX + 1 - boundingRectangle.minX;
        let brH = boundingRectangle.maxY + 1 - boundingRectangle.minY;
        let scaling = 190 / (brW > brH ? brW : brH);
        // scale
        copyCtx.translate(canvas.width / 2, canvas.height / 2);
        copyCtx.scale(scaling, scaling);
        copyCtx.translate(-canvas.width / 2, -canvas.height / 2);
        // translate to center of mass
        copyCtx.translate(trans.transX, trans.transY);

        copyCtx.drawImage(context.canvas, 0, 0);

        // теперь изображение bin в 10x10 блоков (с изображением 28x28)
        imgData = copyCtx.getImageData(0, 0, 280, 280);
        grayscaleImg = imgUtil.imageDataToGrayscale(imgData);
        console.log(grayscaleImg);

        let nnInput = new Array(784), nnInput2 = [];
        for (let y = 0; y < 28; y++) {
            for (let x = 0; x < 28; x++) {
                let mean = 0;
                for (let v = 0; v < 10; v++) {
                    for (let h = 0; h < 10; h++) {
                        mean += grayscaleImg[y * 10 + v][x * 10 + h];
                    }
                }
                mean = (1 - mean / 100); // средний и инвертированный
                nnInput[x * 28 + y] = (mean - .5) / .5;
            }
        }

        let thumbnail = thumbnailCtx.getImageData(0, 0, footprint.width, footprint.height);


        // для визуализации / отладки: покрасьте ввод в нейронную сеть.
        //if (document.getElementById('preprocessing').checked == true) {
        if (true) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(copyCtx.canvas, 0, 0);
            for (let y = 0; y < 28; y++) {
                for (let x = 0; x < 28; x++) {
                    let block = context.getImageData(x * 10, y * 10, 10, 10);
                    let newVal = 255 * (0.5 - nnInput[x * 28 + y] / 2);
                    nnInput2.push(Math.round((255 - newVal) / 255 * 100) / 100);
                    for (let i = 0; i < 4 * 10 * 10; i += 4) {
                        block.data[i] = newVal;
                        block.data[i + 1] = newVal;
                        block.data[i + 2] = newVal;
                        block.data[i + 3] = 255;
                    }
                    context.putImageData(block, x * 10, y * 10);

                    thumbnail.data[(y * 28 + x) * 4] = newVal;
                    thumbnail.data[(y * 28 + x) * 4 + 1] = newVal;
                    thumbnail.data[(y * 28 + x) * 4 + 2] = newVal;
                    thumbnail.data[(y * 28 + x) * 4 + 3] = 255;
                }
            }
        }
        thumbnailCtx.putImageData(thumbnail, 0, 0);
        //console.log(nnInput2);
        let output = window["nn"](nnInput2);
        //console.log(output);
        maxIndex = 0;
        output.reduce(function (p, c, i) {
            if (p < c) {
                maxIndex = i;
                return c;
            } else return p;
        });
        console.log('Detect1: ' + maxIndex);
        document.getElementById('result').innerText = maxIndex.toString();
        isRecognized = false;
        isRecognized = true;

    }, false)


}, false); // end window.onLoad

let input = window["nn"](input1);
maxIndex = 1;
input.reduce(function (p, c, j) {
    if (p > c) {
        maxIndex = j;
        return c;
    } else return p;
});