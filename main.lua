-- Hello World test game

image = nil

function love.load()
	love.window.setTitle('Hello World')
	love.window.setMode(780, 500)
	love.graphics.setBackgroundColor(0, 0, 0)
	image = love.graphics.newImage('gfx/hQ.png')
end

function love.draw()
	print('Hello World!') -- !
	love.graphics.print('Hello World!', 350, 150)
	love.graphics.draw(image, 350, 200)
end
