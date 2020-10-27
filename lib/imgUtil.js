// вычисляет центр массы цифры, для центрирования
// примечание 1 означает черный (0 белый), поэтому мы должны инвертировать.
function centerImage(img) {
    let meanX = 0;
    let meanY = 0;
    let rows = img.length;
    let columns = img[0].length;
    let sumPixels = 0;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            let pixel = (1 - img[y][x]);
            sumPixels += pixel;
            meanY += y * pixel;
            meanX += x * pixel;
        }
    }
    meanX /= sumPixels;
    meanY /= sumPixels;

    let dY = Math.round(rows / 2 - meanY);
    let dX = Math.round(columns / 2 - meanX);
    return {transX: dX, transY: dY};
}

// учитывая изображение в градациях серого, найдите ограничивающий прямоугольник определенной цифры
// над пороговым окружением
function getBoundingRectangle(img, threshold) {
    let rows = img.length;
    let columns = img[0].length;
    let minX = columns;
    let minY = rows;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            if (img[y][x] < threshold) {
                if (minX > x) minX = x;
                if (maxX < x) maxX = x;
                if (minY > y) minY = y;
                if (maxY < y) maxY = y;
            }
        }
    }
    return {minY: minY, minX: minX, maxY: maxY, maxX: maxX};
}

function imageDataToGrayscale(imgData) {
    let grayscaleImg = [];
    for (let y = 0; y < imgData.height; y++) {
        grayscaleImg[y] = [];
        for (let x = 0; x < imgData.width; x++) {
            let offset = y * 4 * imgData.width + 4 * x;
            let alpha = imgData.data[offset + 3];
            // странно: при рисовании с инсультом альфа == 0 означает белый;
            // alpha> 0 - значение оттенков серого; в этом случае я просто беру значение R
            if (alpha === 0) {
                imgData.data[offset] = 255;
                imgData.data[offset + 1] = 255;
                imgData.data[offset + 2] = 255;
            }
            //imgData.data[offset+3] = 255;
            imgData.data[offset + 3] = 255;
            // просто принимаем значение красного канала. Не правильно, но работает для
            // черно-белые изображения.
            grayscaleImg[y][x] = imgData.data[y * 4 * imgData.width + x * 4 + 0] / 255;
            //grayscaleImg[y][x]  = imgData.data[y*4*imgData.width + x*4 +0] /255;
        }
    }
    return grayscaleImg;
}

module.exports = {
    imageDataToGrayscale: imageDataToGrayscale,
    getBoundingRectangle: getBoundingRectangle,
    centerImage: centerImage
};
