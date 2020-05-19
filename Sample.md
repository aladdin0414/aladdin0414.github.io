# Kotlin 实战 | 干掉 findViewById 和 Activity 中的业务逻辑

上一篇介绍了运用 Kotlin DSL 构建布局的方法，相较于 XML，可读性和性能都有显著提升。如果这套 DSL 还能数据绑定就更好了，这样就能去掉 findViewById 和 Activity 中的业务逻辑代码（findViewById 需要遍历 View 树，这是耗时的，而 Activity 中的业务逻辑让其变得越发臃肿）。这一篇就介绍一种实现思路。

![PNG](images/sample.jpeg)

## 数据绑定原始方式
在没有 Data Binding 之前，我们是这样为控件绑定数据的：

```
class MainActivity : AppCompatActivity() {
    private var tvName: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        //'获取控件引用'
        tvName = findViewById<TextView>(R.id.tvName)
    }
    
    override fun onUserReturn(user: User){
        //'在数据返回时设置控件'
        tvName?.text  = user.name
    }
}
```
tvName被静态地声明在 XML 中，程序动态地通过findViewById()获取引用，在数据返回的地方调用设值 API。
静态的意味着可以预先定义，且保持不变。而动态的恰恰相反。
对于某个特定的业务场景，除了界面布局是静态的之外，布局中某个控件和哪个数据绑定也是静态的。这种绑定关系最初是通过“动态”代码实现的，直到出现了Data Binding。
## Data Binding
它是 Google 推出的一种将数据和控件相关联的方法。
如果把 XML 称为声明型的，那 Kotlin 代码就是程序型的，前者是静态的，后者是动态的。为了让它俩关联，Data Binding 的思路是把程序型的变量引入到声明型的布局中，比如下面把 User.name 绑定到 TextView 上( data_binding_activity.xml )：

```
<?xml version="1.0" encoding="utf-8"?>
<layout xmlns:android="http://schemas.android.com/apk/res/android">
   <data>
       <variable name="user" type="com.test.User"/>
   </data>

    <TextView 
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:text="@{user.name}"/>
</layout>
```
其中User是程序型的实体类：

```
package com.test
data class User(var name: ObservableField<String>, var age: ObservableField<Int>)

```

ObservableField用于将任何类型包装成可被观察的对象，当对象值发生变化时，观察者就会被通知。在 Data Binding 中，控件是观察者。

在 Activity 中，这样写代码就完成了数据绑定：

```
class MainActivity: AppCompatActivity() {
    //'声明在 Activity 中的数据源'
    private var user:User? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        //'为 Activity 设置布局并绑定控件'
        val binding = DataBindingUtil.setContentView<DataBindingActivityBinding>(this, R.layout.data_binding_activity);
        //'绑定数据源'
        binding.user = this.user
    }

    override fun onUserReturn(user: User){
        //'修改数据源'
        this.user.name.set( user.name )
    }
}

```
