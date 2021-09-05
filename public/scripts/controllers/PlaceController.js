'use strict';
angular.module('app').controller('PlaceCtrl',
  function ($scope, $mdDialog, Toast, $translate, Place, Category, Auth) {

    // Pagination options
    $scope.rowOptions = [5, 25, 50, 100];

    $scope.query = {
      canonical: '',
      limit: 25,
      page: 1,
      total: 0,
      isFeatured: null,
      status: null,
      category: null,
      date: null
    };

    $scope.places = [];

    $scope.tableOptions = {
      rowSelection: true,
      multiSelect: true
    };

    $scope.input = {
      status: ''
    };

    $scope.placesSelected = [];

    $scope.onUpdatePlaces = function () {

      angular.forEach($scope.placesSelected, function (place) {
        place.status = $scope.input.status;
      });

      Place.saveAll($scope.placesSelected).then(function () {

        $translate('SAVED').then(function (str) {
          Toast.show(str);
        });

        $scope.onReload();
        $scope.placesSelected = [];
        $scope.isSaving = false;

      }, function (error) {
        Toast.show(error.message);
        $scope.onReload();
        $scope.placesSelected = [];
        $scope.isSaving = false;
      });
    };

    $scope.onDeletePlaces = function (ev, obj) {

      $translate(['DELETE', 'CONFIRM_DELETE_MULTIPLE', 'CONFIRM', 'CANCEL', 'DELETED'])
        .then(function (str) {

          var confirm = $mdDialog.confirm()
            .title(str.DELETE)
            .textContent(str.CONFIRM_DELETE_MULTIPLE)
            .ariaLabel(str.DELETE)
            .ok(str.CONFIRM)
            .cancel(str.CANCEL);
          $mdDialog.show(confirm).then(function () {

            Place.destroyAll($scope.placesSelected).then(function () {
              $translate('DELETED').then(function (str) {
                Toast.show(str);
              });

              $scope.placesSelected = [];
              $scope.onReload();
            }, function (error) {
              Toast.show(error.message);
              $scope.placesSelected = [];
              $scope.onReload();
            });
          });

        });
    };

    var loadPlaces = function () {
      Auth.ensureLoggedIn().then(function () {
        $scope.promise = Place.all($scope.query).then(function (places) {
          $scope.places = places;
          $scope.$apply();
        });
      });
    };

    loadPlaces();

    var loadCount = function () {
      Auth.ensureLoggedIn().then(function () {
        Place.count($scope.query).then(function (total) {
          $scope.query.total = total;
          $scope.$apply();
        });
      });
    }

    loadCount();

    $scope.queryCategories = function (query) {
      var query = query || '';
      return Category.all({
        canonical: query.toLowerCase(),
        orderBy: 'asc',
        orderByField: 'title'
      });
    };

    $scope.onReload = function () {
      $scope.query.page = 1;
      $scope.query.total = 0;
      loadPlaces();
      loadCount();
    }

    $scope.onChangeStatus = function (obj, status) {
      obj.status = status;
      Place.save(obj).then(function () {
        $translate('SAVED').then(function (str) {
          Toast.show(str);
        });
      });
    };

    $scope.onFileRead = function (workbook) {

      var places = [];
      for (var sheetName in workbook.Sheets) {
        var array = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        for (var i = 0; i < array.length; i++) {
          var element = array[i];
          var place = new Place;

          var placeId = element.place_id ? element.place_id.trim() : '';

          if (!placeId) {
            place.address = element.address ? element.address.trim() : '';
            place.website = element.website ? element.website.trim() : '';
            place.phone = element.phone ? element.phone.trim() : '';

            if (element.latitude && element.longitude) {
              place.location = {
                latitude: Number(element.latitude),
                longitude: Number(element.longitude),
              }
            }
          }

          place.title = element.title ? element.title.trim() : '';
          place.description = element.description ? element.description.trim() : '';
          place.longDescription = element.longDescription ? element.longDescription.trim() : '';
          place.facebook = element.facebook ? element.facebook.trim() : '';
          place.instagram = element.instagram ? element.instagram.trim() : '';
          place.youtube = element.youtube ? element.youtube.trim() : '';
          place.tags = element.tags ? element.tags.trim().split(',') : [];
          place.place_id = placeId;

          places.push(place);
        }
      }

      if (places.length) {

        $translate('IMPORTING').then(function (str) {
          Toast.show(str);
        });

        $scope.placesSelected = [];

        Place.saveAll(places).then(function () {

          $translate('SAVED').then(function (str) {
            Toast.show(str);
          });

          $scope.onReload();

        }, function () {
          $translate('ERROR_IMPORT').then(function (str) {
            Toast.show(str);
          });
        });
      }
    };

    $scope.onFileReadError = function (e) {
      console.log(e);
    };

    $scope.onViewAnalytics = function (ev, obj) {

      $mdDialog.show({
        controller: 'DialogPlaceAnalyticsController',
        templateUrl: '/views/partials/place-stats.html',
        parent: angular.element(document.body),
        targetEvent: ev,
        locals: {
          obj: obj
        },
        clickOutsideToClose: true
      });
    };

    $scope.onEdit = function (ev, obj) {

      $mdDialog.show({
        controller: 'DialogPlaceController',
        templateUrl: '/views/partials/place.html',
        parent: angular.element(document.body),
        targetEvent: ev,
        locals: {
          obj: obj || null
        },
        clickOutsideToClose: true
      })
        .then(function (response) {

          if (response) {
            loadPlaces();
            loadCount();
          }

        });
    };

    $scope.onPaginationChange = function (page, limit) {
      $scope.placesSelected = [];
      $scope.query.page = page;
      $scope.query.limit = limit;
      loadPlaces();
    };

    $scope.onExpiresAtClicked = function (ev, obj) {

      $mdDialog.show({
        controller: 'DialogPlaceExpiresAtController',
        templateUrl: '/views/partials/expiration-modal.html',
        parent: angular.element(document.body),
        targetEvent: ev,
        clickOutsideToClose: true,
        locals: {
          obj: obj
        }
      });

    }

    $scope.onDelete = function (ev, obj) {

      $translate(['DELETE', 'CONFIRM_DELETE', 'CONFIRM', 'CANCEL', 'DELETED']).then(function (str) {

        var confirm = $mdDialog.confirm()
          .title(str.DELETE)
          .textContent(str.CONFIRM_DELETE)
          .ariaLabel(str.DELETE)
          .ok(str.CONFIRM)
          .cancel(str.CANCEL);
        $mdDialog.show(confirm).then(function () {

          Place.delete(obj).then(function () {
            $translate('DELETED').then(function (str) {
              Toast.show(str);
            });
            loadPlaces();
            loadCount();
            $scope.placesSelected = [];
          }, function (error) {
            Toast.show(error.message);
          });
        });

      });
    };

  }).controller('DialogPlaceController', function (
    $scope, $mdDialog, $mdConstant, Toast, $translate, Place, User, Category, File, NgMap, GeoCoder, obj) {

    var marker, map;

    $scope.placeFromGooglePlaces = null;

    $scope.autocompleteOptions = {}

    $scope.tinymceOptions = {
      height: 500,
      skin: 'lightgray',
      theme: 'modern',
      content_style: "img { max-width: 100%; height: auto; }",
      image_dimensions: false,
      media_dimensions: false,
      media_live_embeds: true,
      file_picker_types: 'image media',
      relative_urls: false,
      remove_script_host: false,
      file_picker_callback: function (cb, value, meta) {

        var input = document.createElement('input');
        input.setAttribute('type', 'file');

        if (meta.filetype == 'image') {
          input.setAttribute('accept', 'image/*');
        }

        if (meta.filetype == 'media') {
          input.setAttribute('accept', 'video/*');
        }

        input.onchange = function () {
          var file = this.files[0];

          File.upload(file, file.name).then(function (savedFile) {
            cb(savedFile.url(), {
              title: savedFile.name()
            });
          })

        };

        input.click();
      },
      extended_valid_elements: 'iframe[src|width|height|name|align|frameborder|scrolling]',
      plugins: 'link image code media imagetools hr table lists searchreplace wordcount visualblocks visualchars code fullscreen emoticons',
      toolbar: 'formatselect | bold italic strikethrough forecolor backcolor | link image media emoticons | alignleft aligncenter alignright alignjustify | numlist bullist outdent indent | removeformat'
    };

    $scope.$watch(function (scope) {
      return scope.placeFromGooglePlaces;
    }, function (newValue) {

      if (newValue) {
        $scope.obj.title = $scope.placeFromGooglePlaces.name;
        $scope.obj.address = $scope.placeFromGooglePlaces.formatted_address;
        $scope.obj.website = $scope.placeFromGooglePlaces.website;
        $scope.obj.phone = $scope.placeFromGooglePlaces.formatted_phone_number;

        $scope.obj.googlePhotos = $scope.placeFromGooglePlaces.photos.map(function (image) {
          return image.getUrl({
            maxWidth: 800
          })
        });

        $scope.input = {
          latitude: $scope.placeFromGooglePlaces.geometry.location.lat(),
          longitude: $scope.placeFromGooglePlaces.geometry.location.lng()
        };

        $scope.onInputLocationChanged();
      }
    });

    $scope.obj = obj || new Place;
    $scope.tags = $scope.obj.tags || [];
    $scope.input = {};

    $scope.categories = $scope.obj.categories || [];

    $scope.separatorKeys = [
      $mdConstant.KEY_CODE.ENTER,
      $mdConstant.KEY_CODE.COMMA,
    ];

    $scope.images = []

    if ($scope.obj.images) {
      $scope.images = $scope.obj.images.map(function (image) {
        return {
          isUploading: false,
          file: image
        }
      })
    }

    if ($scope.obj.location) {
      $scope.input.latitude = $scope.obj.location.latitude;
      $scope.input.longitude = $scope.obj.location.longitude;
    };

    $scope.queryUsers = function (query) {
      query = query || '';
      return User.all({
        canonical: query.toLowerCase(),
        orderBy: 'asc',
        orderByField: 'name',
        limit: 10,
        page: 1,
      }).then(function (data) {
        return data.users;
      });
    };

    $scope.onAddressChanged = function () {
      GeoCoder.geocode({
        address: $scope.obj.address
      }).then(function (result) {

        if (map) {

          var location = result[0].geometry.location;
          location = new google.maps.LatLng(location.lat(), location.lng());

          map.setCenter(location);
          map.setZoom(15);

          marker.setPosition(location);

          $scope.obj.location = new Parse.GeoPoint({
            latitude: location.lat(),
            longitude: location.lng()
          });

          $scope.input.latitude = location.lat();
          $scope.input.longitude = location.lng();
          $scope.$apply();
        }
      });
    }

    NgMap.getMap().then(function (objMap) {

      map = objMap;
      marker = map.markers[0];

      // Fix gray area in second render
      google.maps.event.trigger(map, 'resize');

      if ($scope.obj.location) {

        var placeLocation = new google.maps.LatLng(
          $scope.obj.location.latitude,
          $scope.obj.location.longitude);

        map.setCenter(placeLocation)
        marker.setPosition(placeLocation);
        map.setZoom(15);
      } else {
        map.setZoom(1);
        map.setCenter(new google.maps.LatLng(0, 0));
      }
    });

    $scope.queryCategories = function (query) {
      var ids = $scope.categories.map(function (item) {
        return item.id
      });
      return Category.all({
        canonical: query ? query.toLowerCase() : '',
        exclude: ids,
        orderBy: 'asc',
        orderByField: 'name',
      });
    };

    $scope.onMarkerDragEnd = function (ev) {

      var lat = ev.latLng.lat();
      var lng = ev.latLng.lng();

      $scope.obj.location = new Parse.GeoPoint({
        latitude: lat,
        longitude: lng
      });

      $scope.input.latitude = lat;
      $scope.input.longitude = lng;
    };

    $scope.onInputLocationChanged = function () {

      if ($scope.input.latitude && $scope.input.longitude && map) {

        $scope.obj.location = new Parse.GeoPoint({
          latitude: $scope.input.latitude,
          longitude: $scope.input.longitude
        });

        marker.setPosition(new google.maps.LatLng(
          $scope.input.latitude,
          $scope.input.longitude
        ));

        map.setCenter(new google.maps.LatLng(
          $scope.input.latitude,
          $scope.input.longitude
        ));

        map.setZoom(12);
      }
    }

    $scope.onDeleteImage = function (image) {
      var index = $scope.images.indexOf(image);
      if (index !== -1) {
        $scope.images.splice(index, 1);
      }
    }

    $scope.onImageClicked = function (file) {
      if (file) {
        var viewer = ImageViewer();
        viewer.show(file.url());
      }
    };

    $scope.onSetImageAsFeatured = function (file) {
      $scope.obj.image = file;
      $scope.obj.featuredImageName = file.name();
    };

    $scope.onUploadImages = function (files) {

      if (files && files.length) {

        angular.forEach(files, function (file) {

          var index = $scope.images.push({
            isUploading: true,
            file: null
          }) - 1;

          $scope.images[index].isUploading = true;

          File.upload(file).then(function (savedFile) {

            $scope.images[index].file = savedFile;
            $scope.images[index].isUploading = false;
            $scope.$apply();

          }, function (error) {
            Toast.show(error.message);
            $scope.images[index].isUploading = false;
            $scope.$apply();
          });

        });

      }
    };

    $scope.uploadImageOne = function (file, invalidFile) {

      if (file) {

        $scope.isImageOneUploading = true;
        $scope.imageOneFilename = file.name;

        File.upload(file).then(function (savedFile) {

          $scope.obj.image = savedFile;
          $scope.isImageOneUploading = false;
          $scope.$apply();
        },
          function (error) {
            $scope.isImageOneUploading = false;
            Toast.show(error.message);
            $scope.$apply();
          });

      } else {
        if (invalidFile) {
          if (invalidFile.$error === 'maxSize') {
            Toast.show('Image too big. Max ' + invalidFile.$errorParam);
          }
        }
      }
    };

    $scope.uploadIcon = function (file) {

      if (file === null || file.type.match(/image.*/) === null) {
        return $translate('FILE_NOT_SUPPORTED').then(function (str) {
          Toast.show(str);
        });
      }

      $scope.isUploading = true;

      File.upload(file).then(function (savedFile) {
        $scope.obj.icon = savedFile;
        $scope.isUploading = false;
        $scope.$apply();

        $translate('FILE_UPLOADED').then(function (str) {
          Toast.show(str);
        });

      }, function (error) {
        Toast.show(error.message);
        $scope.isUploading = false;
        $scope.$apply();
      });
    }

    $scope.onClose = function () {
      if ($scope.obj.dirty()) $scope.obj.revert();
      $mdDialog.cancel();
    };

    $scope.onSubmit = function () {

      if (!$scope.obj.location) {
        return $translate('LOCATION_REQUIRED').then(function (str) {
          Toast.show(str);
        });
      }

      $scope.isSaving = true;

      $scope.obj.images = $scope.images.map(function (image) {
        if (image.file) {
          return image.file;
        }
      });

      $scope.obj.tags = $scope.tags;
      $scope.obj.categories = $scope.categories;

      Place.save($scope.obj).then(function (obj) {
        $translate('SAVED').then(function (str) {
          Toast.show(str);
        });
        $mdDialog.hide(obj);
        $scope.isSaving = false;
        $scope.$apply();
      },
        function (error) {
          Toast.show(error.message);
          $scope.isSaving = false;
          $scope.$apply();
        });

    };

  }).controller('DialogPlaceExpiresAtController',
    function ($scope, $mdDialog, Toast, $translate, Place, obj) {

      $scope.obj = obj;
      $scope.formData = {};

      $scope.isDayInvalid = function () {
        var days = $scope.formData.days;

        if (days) {
          days = parseInt(days, 10);
          return days < 1;
        }
        return true;
      }

      $scope.onSubmit = function () {

        var expiresAt = moment(obj.expiresAt)
          .add($scope.formData.days, 'days')
          .startOf('day')
          .toDate()

        obj.expiresAt = expiresAt;
        obj.status = 'Approved';

        $scope.isSaving = true;

        Place.save(obj).then(function () {
          $scope.isSaving = false;
          $translate('SAVED').then(function (str) {
            Toast.show(str);
          });
          $scope.onClose();
          $scope.$apply();
        },
          function (error) {
            $scope.isSaving = false;
            Toast.show(error.message);
            $scope.$apply();
          });
      }

      $scope.onClose = function () {
        $mdDialog.hide();
      };

    }).directive('numbersOnly', function () {
      return {
        require: 'ngModel',
        link: function (scope, element, attr, ngModelCtrl) {
          function fromUser(text) {
            if (text) {
              var transformedInput = text.replace(/[^0-9]/g, '');

              if (transformedInput !== text) {
                ngModelCtrl.$setViewValue(transformedInput);
                ngModelCtrl.$render();
              }
              return transformedInput;
            }
            return undefined;
          }
          ngModelCtrl.$parsers.push(fromUser);
        }
      };
    }).controller('DialogPlaceAnalyticsController', function ($scope, $mdDialog, Place, obj) {

      $scope.obj = obj;
      $scope.isLoading = true;

      $scope.params = {
        placeId: obj.id,
        filterId: 'all_time',
        startDate: null,
        endDate: null,
      };

      $scope.statistics = {
        views: 0,
        likes: 0,
        calls: 0,
      };

      var now = new Date;

      $scope.filters = [{
        id: 'today',
        startDate: dateFns.startOfToday(),
        endDate: dateFns.endOfToday()
      }, {
        id: 'this_week',
        startDate: dateFns.startOfWeek(now),
        endDate: dateFns.endOfWeek(now)
      }, {
        id: 'this_month',
        startDate: dateFns.startOfMonth(now),
        endDate: dateFns.endOfMonth(now)
      }, {
        id: 'all_time'
      }]

      $scope.selectedFilter = $scope.filters[$scope.filters.length - 1];

      $scope.onFilterButtonTouched = function (filter) {
        $scope.selectedFilter = filter;

        $scope.params.filterId = filter.id;
        $scope.params.startDate = filter.startDate;
        $scope.params.endDate = filter.endDate;

        if ($scope.selectedFilter.id === 'all_time') {
          $scope.statistics.likes = $scope.obj.likeCount || 0;
          $scope.statistics.views = $scope.obj.viewCount || 0;
          $scope.statistics.calls = $scope.obj.callCount || 0;
        } else {
          $scope.loadStatistics($scope.params);
        }
      }

      $scope.loadStatistics = function (params) {
        Place.getStatistics(params).then(function (data) {
          $scope.statistics = data;
          $scope.isLoading = false;
          $scope.$apply();
        }, function () {
          $scope.isLoading = false;
          $scope.$apply();
        })
      };

      $scope.onClose = function () {
        $mdDialog.hide();
      };

      $scope.loadStatistics($scope.params);
    });