(function() {
	window.jformFactory.plugin("bootstrap",function(jform) {
		return {
			showErrors: function() {
				jform.container.find(".has-error").removeClass("has-error");
				if (jform.errors.length > 0) {
					_.each(jform.errors, function(item) {
						item.field.line.line.addClass("has-error");
					});
				}
			},
			resetErrors: function() {
				jform.container.find(".has-error").removeClass("has-error");
			}
		}
	}, {
		description:	"Bootstrap: Utilities to manage bootstrap forms like showing errors for example.",
		version:		1.0,
		author:			"Julien Loutre <julien@twenty-six-medias.com>"
	});
})();