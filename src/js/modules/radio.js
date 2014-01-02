(function() {
	var module = function(jform, data) {
		this.jform 	= jform;
		this.data 	= data;
		this.value	= "";
		this.onUpdateCallback = function(){};
	}
	module.prototype.build = function(line) {
		var scope	= this;
		this.line	= line;
		var gid		= _.uniqueId(scope.data.name);
		
		_.each(this.data.list, function(item) {
			var id			= _.uniqueId(scope.data.name);
			var container	= window.jformFactory.dom("div", line.field);
				container.addClass("radio");
			var field		= window.jformFactory.dom("input", container, true);
				field.type		= "radio";
				field = $(field);
				field.attr("id", 	id);
				field.attr("name", 	gid);
				field.attr("value", item.value);
				field.click(function() {
					scope.onUpdateCallback();
				});
			var label	= window.jformFactory.dom("label", container);
				label.html(item.label);
				label.attr('for', id);
		});
		
	}
	module.prototype.validate = function(val) {
		if (this.val() && this.val()!= "") {
			return true;
		}
		return false;
	}
	module.prototype.val = function(val) {
		if (val && val !== false) {
			this.value = val();
		} else {
			return this.line.field.find('input[type=radio]:checked').val();
		}
	}
	module.prototype.onUpdate = function(callback) {
		this.onUpdateCallback = callback;
	}
	module.prototype.remove = function() {
		
	}
	window.jformFactory.register("radio", module, {
		description:	"Radio, simple radio list",
		version:		1.0,
		author:			"Julien Loutre <julien@twenty-six-medias.com>"
	});
})();