(function() {
	var module = function(jform, data) {
		this.jform 	= jform;
		this.data 	= data;
		this.value	= [];
		this.onUpdateCallback = function(){};
	}
	module.prototype.build = function(line) {
		var scope	= this;
		this.line	= line;
		_.each(this.data.list, function(item) {
			var id			= _.uniqueId(scope.data.name);
			var container	= window.jformFactory.dom("div", line.field);
				container.addClass("checkbox");
			var field		= window.jformFactory.dom("input", container, true);
				field.type		= "checkbox";
				field = $(field);
				field.attr("id", id);
				field.click(function() {
					if (field.is(':checked')) {
						scope.value.push(item.value);
						scope.value = _.uniq(scope.value);
					} else {
						scope.value = _.without(scope.value, item.value);
					}
					scope.onUpdateCallback();
				});
			var label	= window.jformFactory.dom("label", container);
				label.html(item.label);
				label.attr('for', id);
		});
		
	}
	module.prototype.validate = function(val) {
		if (this.value.length > 0) {
			return true;
		}
		return false;
	}
	module.prototype.val = function(val) {
		if (val && val !== false) {
			this.value = val();
		} else {
			return this.value;
		}
	}
	module.prototype.onUpdate = function(callback) {
		this.onUpdateCallback = callback;
	}
	module.prototype.remove = function() {
		
	}
	window.jformFactory.register("checkbox", module, {
		description:	"Checkbox, simple checkbox list",
		version:		1.0,
		author:			"Julien Loutre <julien@twenty-six-medias.com>"
	});
})();