let history_dom = echarts.init(document.getElementById(HISTORY_DOM));

avalon.config({
    interpolate: ['{$', '$}']
});
let vm = avalon.define({
    $id: 'qqzone',
    nick_name: '',
    qq_id: '',
    stop_num: -1,
    stop_date: '-1',
    no_delete: false,
    agree: false,
    disable: 'false',
    qq_cookie: '',
    begin_spider: 0,
    spider_info: [],
    true_mood_num: -1,
    spider_num: 0,
    show_process: 0,
    process_width: 0,
    spider_text: SPIDER_TEXT.DOING,
    spider_state: SPIDER_STATE.CONFIG,
    clean_data_text: CLEAN_DATA_TEXT.DOING,
    data_state: CLEAN_DATA_STATE.DOING,
    visual_data_url: '',
    password: '',
    view_data_state: VIEW_DATA_STATE.config,
    user: {},
    view_data: function(){
        $.ajax({
            url: '/data/' + vm.qq_id + '/' + sha1(vm.password),
            type: 'GET',
            success: function (res) {
                res= JSON.parse(res);
                if (res.finish){
                    vm.view_data_state = VIEW_DATA_STATE.data;
                    vm.user = res.user;
                    vm.fetch_history_data();
                }

            }
         })
    },

    submit_data: function () {
        if (vm.qq_id !== '' && vm.nick_name !== '' && vm.cookie !== '') {
            if (agree) {
                $.ajax({
                    url: "/start_spider",
                    type: 'post',
                    data: {
                        nick_name: vm.nick_name,
                        qq: vm.qq_id,
                        stop_time: vm.stop_date,
                        mood_num: vm.stop_num,
                        cookie: vm.qq_cookie,
                        no_delete: vm.no_delete,
                        password: sha1(vm.password)
                    },
                    success: function (data) {
                        data = JSON.parse(data);
                        if (data.result === 1) {
                            //alert("success");
                            vm.begin_spider = 1;
                            vm.spider_state = SPIDER_STATE.SPIDER;
                            vm.query_interval = setInterval(function () {
                                vm.query_spider_info(vm.qq_id);
                            }, 1000);

                        } else {
                            alert("未知错误:" + data.result)
                        }
                    }
                })
            }
        } else {
            alert("昵称、QQ号、Cookie不能为空");
        }

    },

    query_spider_info: function (QQ) {
        $.ajax({
            url: '/query_spider_info/' + QQ + '/' + sha1(vm.password),
            type: 'GET',
            success: function (data) {
                data = JSON.parse(data);
                if (data.info.length > 2) {
                    vm.spider_info.push(data.info);
                }

                if (data.finish === 1) {
                    vm.show_process = 1;
                    vm.true_mood_num = data.mood_num;
                    clearInterval(vm.query_interval);
                    vm.query_num = setInterval(function () {
                        vm.query_spider_num(vm.qq_id);
                    }, 1000);
                } else if (data.finish === -1) {
                    alert(data.info);
                    vm.show_process = 0;
                    vm.spider_state = SPIDER_STATE.CONFIG;
                    clearInterval(vm.query_interval);
                } else if(data.finish === -2){
                    clearInterval(vm.query_interval);
                    alert("识别码与QQ不匹配");
                }
            }
        })
    },
    stop_spider: function () {
        //避免用户多次点击停止爬虫导致保存数据出错
        if (vm.spider_text !== SPIDER_TEXT.STOP) {
            clearInterval(vm.query_num);
            vm.spider_text = SPIDER_TEXT.STOP;
            $.ajax({
                url: '/stop_spider/' + vm.qq_id + '/' + sha1(vm.password),
                type: 'get',
                success: function (data) {
                    data = JSON.parse(data);
                    if (data.finish !== -2) {
                        vm.spider_state = SPIDER_STATE.FINISH;
                        vm.spider_num = parseInt(data.num);
                        vm.query_clean_state();
                    }else{
                        alert("识别码与QQ不匹配");
                    }
                }
            });
        }
    },
    query_spider_num: function (QQ) {
        $.ajax({
            url: '/query_spider_num/' + QQ + '/' + vm.true_mood_num + '/' + sha1(vm.password),
            type: 'GET',
            success: function (data) {
                data = JSON.parse(data);
                vm.spider_num = data.num;
                vm.process_width = Math.ceil(parseInt(vm.spider_num) / parseInt(vm.true_mood_num) * 100) + "%";
                if (data.finish === 1) {
                    clearInterval(vm.query_num);
                    vm.spider_state = SPIDER_STATE.FINISH;
                    vm.data_state = CLEAN_DATA_STATE.DOING;
                    vm.query_clean_state();
                }else if (data.finish === -2){
                    alert("识别码与QQ不匹配");
                    clearInterval(vm.query_num);
                }

            }
        })
    },
    query_clean_state: function () {
        $.ajax({
            url: '/query_clean_data/' + vm.qq_id + '/' + sha1(vm.password),
            type: 'GET',
            success: function (data) {
                data = JSON.parse(data);
                if (data.finish === '1') {
                    vm.data_state = CLEAN_DATA_STATE.FINISH;
                }else if (data.finish === -2){
                    alert("识别码与QQ不匹配");
                }
            }
        })
    },
    clear_cache: function () {
    },
    fetch_history_data: function () {
        $.ajax({
            url: '/get_history/'+ vm.qq_id +'/' + vm.nick_name + '/' + sha1(vm.password),
            success: function (result) {
                console.log(result);
                result = JSON.parse(result);
                if (result.finish){
                    data = result.data;
                    draw_history_line(history_dom, data, "QQ空间说说历史曲线图");
                }

            }
        })
    },
    encrypt: function(){
        return sha1(vm.password);
    },
    download_excel: function () {
        $.ajax({
            url: '/download_excel/' +vm.qq_id + '/' + sha1(vm.password),
            type: 'get',
            success: function () {
                
            }
        })
    }
});

vm.$watch("agree", function (new_v, old_v) {
    switch (new_v) {
        case true:
            $('#start_get').removeAttr("disabled");
            break;
        case false:
            $('#start_get').attr("disabled", "true");
            break;
    }
});

vm.$watch("spider_state", function (new_v, old_v) {
    switch (new_v) {
        case SPIDER_STATE.FINISH:
            vm.spider_text = SPIDER_TEXT.FINISH;
            $('#start_get').removeAttr("disabled");
            $('#delete_cache').removeAttr("disabled");
            $('#qq_id').removeAttr("disabled");
            vm.agree = false;
            break;
        case SPIDER_STATE.SPIDER:
            vm.spider_text = SPIDER_TEXT.DOING;
            $('#start_get').attr("disabled", "true");
            $('#delete_cache').attr("disabled", "true");
            $('#password').attr("disabled", "true");
            $('#qq_id').attr("disabled", "true");
            break;
        case SPIDER_STATE.CONFIG:
            $('#password').removeAttr("disabled");
            $('#qq_id').removeAttr("disabled");
    }
});

vm.$watch("data_state", function (new_v, old_v) {
    switch (new_v) {
        case CLEAN_DATA_STATE.DOING:
            vm.clean_data_text = CLEAN_DATA_TEXT.DOING;
            break;
        case CLEAN_DATA_STATE.FINISH:
            vm.clean_data_text = CLEAN_DATA_TEXT.FINISH;
            break;
    }
});