import React, { useState, useEffect } from 'react'
import { DivFlexRow, DivFlexColumn, Button, Input, Table, DelButton } from '../../styles'
import PopupAccessory from './PopupAccessory'
import HistoryCustomer from '../Admin/HistoryCustomer'
import lib from '../../lib'
import { HOST } from '../../Config'
import { connect } from 'react-redux'
import { UpdateBill, SaveBill, ThanhToan, HuyThanhToan, GetBillSuaChuaByMaHoaDon } from '../../API/Bill'
import { GetlistCustomer } from '../../API/Customer'
import { GetListNVSuaChua } from '../../API/Staffs'
import { deleteBillProduct, deleteItemBillProduct, setListBillProduct } from '../../actions/Product';
import { withRouter } from 'react-router-dom'
import PopupBillCHN from './PopupBillCHN';
import { GetListCuaHangNgoai } from '../../API/CuaHangNgoai'

const RepairedBill = (props) => {

    let mCustomerName = lib.handleInput("");
    let mPhone = lib.handleInput("");
    let mAddress = lib.handleInput("");
    let mMaKH = lib.handleInput("");
    let mMaNVSuaChua = lib.handleInput("");
    let [biensoxe, setBienSoXe] = useState("");
    let [isShowHistoryCustomer, setShowHistoryCustomer] = useState(false);
    let [isShowNewBill, setShowNewBill] = useState(false);
    let [isShowCuaHangNgoai, setShowCuaHangNgoai] = useState(false);

    let [listBienSo, setListBienSo] = useState([]);
    let [listCuaHangNgoai, setCuaHangNgoai] = useState([]);
    let [listNhanVienSuaChua, setListNhanVienSuaChua] = useState([]);
    let [maban, setMaban] = useState(null);
    let [isUpdateBill, setUpdateBill] = useState(0);
    let [mMaHoaDon, setMaHoaDon] = useState("");
    let [manhanvien, setMaNhanVien] = useState(-1);
    let tennhanvien = lib.handleInput("");
    let mLoaiXe = lib.handleInput("");
    let mSoKhung = lib.handleInput("");
    let mSoMay = lib.handleInput("");
    let mSoKM = lib.handleInput("0");
    let mYeuCau = lib.handleInput("");
    let mTuVan = lib.handleInput("");



    useEffect(() => {
        GetlistCustomer(props.token).then(response => {
            setListBienSo(response.data);
        })
        GetListNVSuaChua(props.token).then(response => {
            setListNhanVienSuaChua(response.data);
        })
        GetListCuaHangNgoai(props.token).then(res => {
            setCuaHangNgoai(res.data);
        });
    }, [])

    useEffect(() => {
        let pathname = window.location.href;
        let tmp = pathname.substring(pathname.lastIndexOf('/') + 1, pathname.length);
        let mb = Number.parseInt(tmp) - 1;
        setMaban(mb + 1);

        props.socket.on("mahoadon", (data) => {

            if (pathname.indexOf("services/repairedbill") !== -1) {
                if (data && data.trangthai === 0) {
                    props.history.goBack();
                }

                if (data && data.trangthai && data.trangthai === 2) {
                    setUpdateBill(2);
                    setMaHoaDon(data.mahoadon);
                    showHoaDon(data.mahoadon);
                }
                else {
                    mCustomerName.setValue("");
                    mPhone.setValue("");
                    mAddress.setValue("");
                    mMaKH.setValue("");
                    mSoKhung.setValue("");
                    mSoMay.setValue("");
                    mLoaiXe.setValue("");
                    props.deleteBillProduct();
                }
            }
        });

        // props.socket.on('lifttableBill', async data => {
        //         let val = await data;
        //         if(mb > -1) {
        //             if (val && val[mb].trangthai === 0) {
        //                 alert("Có người đã thu hồi bàn này");
        //                 props.history.goBack();
        //             }
        //         }
        // })
        props.socket.emit("maban", mb);
    }, [])

    const exportBill = () => {
        window.open(
            `${HOST}/billsuachua/mahoadon/${mMaHoaDon}/export`,
            '_blank' // <- This is what makes it open in a new window.
        );
    }

    const showHoaDon = (mahoadon) => {
        GetBillSuaChuaByMaHoaDon(props.token, mahoadon).then(res => {
            searchBienSoXe(res.data.biensoxe);
            searchNhanVienSuaChua(res.data.manvsuachua);
            props.setListBillProduct(res.data.chitiet);
            mLoaiXe.setValue(res.data.loaixe);
            mMaKH.setValue(res.data.ma);
            mTuVan.setValue(res.data.tuvansuachua);
            mYeuCau.setValue(res.data.yeucaukhachhang);
            mSoKM.setValue(res.data.sokm);
        })
            .catch(err => {
                alert("Không lấy được hóa đơn.")
            })
    }
    const setCustomer = (lbs, values) => {
        let customer = lbs.find(function (item) {
            return item.biensoxe === values;
        })
        if (customer !== undefined) {
            mCustomerName.setValue(customer.ten);
            mPhone.setValue(customer.sodienthoai);
            mAddress.setValue(customer.diachi);
            mMaKH.setValue(customer.ma);
            mSoKhung.setValue(customer.sokhung);
            mSoMay.setValue(customer.somay);
            mLoaiXe.setValue(customer.loaixe);
        }
        else {
            mCustomerName.setValue("");
            mPhone.setValue("");
            mAddress.setValue("");
            mMaKH.setValue("");
            mSoKhung.setValue("");
            mSoMay.setValue("");
            mLoaiXe.setValue("");
        }
    }

    const searchBienSoXe = (values) => {

        setBienSoXe(values);
        if (!listBienSo || listBienSo.length == 0) {
            GetlistCustomer(props.token).then(response => {
                setListBienSo(response.data);
                setCustomer(response.data, values);
            })
        }
        else
            setCustomer(listBienSo, values);

    }

    const setNhanVienSuaChua = (lbs, values) => {
        let nv = lbs.find(i => i.ma === Number.parseInt(values))
        if (nv) {
            tennhanvien.setValue(nv.ten);
        }
        else
            tennhanvien.setValue("");
    }
    const searchNhanVienSuaChua = (values) => {
        mMaNVSuaChua.setValue(values);
        if (!listNhanVienSuaChua || listNhanVienSuaChua.length == 0) {
            GetListNVSuaChua(props.token).then(response => {
                setListNhanVienSuaChua(response.data);
                setNhanVienSuaChua(response.data, values);
            })
        }
        else
            setNhanVienSuaChua(listNhanVienSuaChua, values);

    }

    const handleSaveBill = () => {
        if (!mMaNVSuaChua.value || mMaNVSuaChua.value == "") {
            alert('Vui lòng điền nhân viên sữa chữa');
            return;
        }

        var tong = 0;
        var listProduct = [];
        if (props.listBillProduct.length === 0) {
            alert("Phiếu Sửa Chữa Rỗng");
            return;
        }
        for (let i = 0; i < props.listBillProduct.length; i++) {
            tong = tong + props.listBillProduct[i].tongtien;
            let temp = {
                tenphutungvacongviec: props.listBillProduct[i].tenphutungvacongviec,
                maphutung: props.listBillProduct[i].maphutung,
                soluongphutung: props.listBillProduct[i].soluongphutung,
                tiencong: props.listBillProduct[i].tiencong,
                dongia: props.listBillProduct[i].dongia,
                manvsuachua: mMaNVSuaChua.value,
                tongtien: props.listBillProduct[i].tongtien
            }
            listProduct.push(temp);
        }
        var data = {
            manvsuachua: mMaNVSuaChua.value,
            tenkh: mCustomerName.value,
            makh: mMaKH.value && mMaKH.value != '' ? mMaKH.value : null,
            tongtien: tong,
            biensoxe: biensoxe,
            chitiet: listProduct,
            manv: props.info.ma,
            yeucaukhachhang: mYeuCau.value,
            tuvansuachua: mTuVan.value,
            sokm: mSoKM.value
        }
        SaveBill(props.token, data).then(Response => {
            props.deleteBillProduct();
            props.socket.emit("bill", { maban: maban - 1, mahoadon: Response.data.mahoadon });
            alert("Tạo Phiếu Sửa Chữa Thành Công - Mã Hóa Đơn:" + Response.data.mahoadon);
            props.history.goBack();
        }).catch(err => {
            alert(JSON.stringify(err.response.data))
        })

    }
    const HuyHoaDon = () => {
        HuyThanhToan(props.token, mMaHoaDon).then(res => {
            props.socket.emit("release", { maban: maban - 1, mahoadon: "" });
            setMaHoaDon("");
            alert('Hủy đã thành công');
            window.location.href='/services';
        })
            .catch(err => {
                alert("Lỗi thanh toán")
            })
    }
    const thanhToanHoaDon = () => {
        ThanhToan(props.token, mMaHoaDon).then(res => {
            props.socket.emit("release", { maban: maban - 1, mahoadon: "" });
            setMaHoaDon("");
            props.history.goBack();
        })
            .catch(err => {
                alert("Lỗi thanh toán")
            })
    }
    const UpdateHoaDon = () => {
        var tong = 0;
        var listProduct = [];
        if (props.listBillProduct.length === 0) {
            alert("Phiếu Sửa Chữa Rỗng");
            return;
        }
        for (let i = 0; i < props.listBillProduct.length; i++) {
            tong = tong + props.listBillProduct[i].tongtien;
            let temp = {
                tenphutungvacongviec: props.listBillProduct[i].tenphutungvacongviec,
                maphutung: props.listBillProduct[i].maphutung,
                soluongphutung: props.listBillProduct[i].soluongphutung,
                tiencong: props.listBillProduct[i].tiencong,
                dongia: props.listBillProduct[i].dongia,
                manvsuachua: mMaNVSuaChua.value,
                tongtien: props.listBillProduct[i].tongtien
            }
            listProduct.push(temp);
        }
        var data = {
            mahoadon: mMaHoaDon,
            tenkh: mCustomerName.value,
            makh: mMaKH.value,
            tongtien: tong,
            biensoxe: biensoxe,
            chitiet: listProduct,
            manv: props.info.ma
        }

        UpdateBill(props.token, data).then(res => {
            alert("Update hóa đơn thành công");
        }).catch(err => {
            alert("Lỗi thanh toán")
        })
    }
    return (
        <div>
            <h1 style={{ textAlign: "center" }}>Phiếu sửa chữa (Bàn số: {maban})</h1>
            <DivFlexRow style={{ alignItems: 'center' }}>
                <DivFlexColumn>
                    <label>Nhân viên sửa chữa: </label>
                    <Input autocomplete="off" list="nv_suachua" name="nv_suachua" value={mMaNVSuaChua.value} onChange={(e) => {
                        searchNhanVienSuaChua(e.target.value);
                    }} />
                    <datalist id="nv_suachua">
                        {
                            listNhanVienSuaChua.map((item, index) => (
                                <option key={index} value={item.ma}>{item.ten}</option>
                            ))}
                    </datalist>
                </DivFlexColumn>
                <DivFlexColumn style={{ marginLeft: 20 }}>
                    <label>Tên nhân viên sửa chữa: </label>
                    <Input autocomplete="off" {...tennhanvien} />
                </DivFlexColumn>
            </DivFlexRow>
            <DivFlexRow style={{ alignItems: 'center' }}>
                <DivFlexColumn>
                    <label>Biển số xe: </label>
                    <Input autocomplete="off" list="bien_so" name="bien_so" value={biensoxe} onChange={(e) => {
                        searchBienSoXe(e.target.value);
                    }} />
                    <datalist id="bien_so">
                        {listBienSo.map((item, index) => (
                            <option key={index} value={item.biensoxe} >{item.ten}</option>
                        ))}
                    </datalist>
                </DivFlexColumn>
                <DivFlexColumn style={{ marginLeft: 20 }}>
                    <label>Tên khách hàng: </label>
                    <Input autocomplete="off" {...mCustomerName} />
                </DivFlexColumn>
                <DivFlexColumn style={{ marginLeft: 20 }}>
                    <label>Số điện thoại: </label>
                    <Input autocomplete="off" {...mPhone} pattern="[0-9]{10}" />
                </DivFlexColumn>
                <DivFlexColumn style={{ marginLeft: 20 }}>
                    <label>Địa chỉ: </label>
                    <Input autocomplete="off" {...mAddress} />
                </DivFlexColumn>
            </DivFlexRow>
            <DivFlexRow style={{ alignItems: 'center' }}>
                <DivFlexColumn>
                    <label>Loại xe: </label>
                    <Input autocomplete="off" {...mLoaiXe} />
                </DivFlexColumn>
                <DivFlexColumn style={{ marginLeft: 20 }}>
                    <label>Số khung: </label>
                    <Input autocomplete="off" {...mSoKhung} />
                </DivFlexColumn>
                <DivFlexColumn style={{ marginLeft: 20 }}>
                    <label>Số máy: </label>
                    <Input autocomplete="off" {...mSoMay} />
                </DivFlexColumn>
                <DivFlexColumn style={{ marginLeft: 20 }}>
                    <label>Số km: </label>
                    <Input autocomplete="off" {...mSoKM} type="Number" max={999999} min={0} />
                </DivFlexColumn>
                <Button onClick={() => setShowHistoryCustomer(true)} style={{ marginLeft: 20, marginTop: 10 }}>
                    Chi tiết
                </Button>
            </DivFlexRow>


            <DivFlexRow style={{ alignItems: 'center' }}>
                <DivFlexColumn>
                    <label>Yêu cầu khách hàng: </label>
                    <Input autocomplete="off" {...mYeuCau} />
                </DivFlexColumn>
                <DivFlexColumn style={{ marginLeft: 20 }}>
                    <label>Tư vấn Sữa chữa: </label>
                    <Input autocomplete="off" {...mTuVan} />
                </DivFlexColumn>
            </DivFlexRow>

            <DivFlexRow style={{ marginTop: 5, marginBottom: 5, justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Bảng giá phụ tùng: </label>
                {isUpdateBill === 0 ? <div></div> :
                    <Button onClick={exportBill}>
                        Export
                </Button>
                }
                <Button onClick={() => setShowCuaHangNgoai(true)}>
                    Thêm của hàng ngoài
                </Button>
                <Button onClick={() => setShowNewBill(true)}>
                    Thêm mới
                </Button>
            </DivFlexRow>
            <Table>
                <tbody>
                    <tr>
                        <th>STT</th>
                        <th>Tên phụ tùng <br /> và công việc</th>
                        <th>Mã phụ tùng</th>
                        <th>Đơn giá</th>
                        <th>SL</th>
                        <th>Tiền phụ tùng</th>
                        <th>Tiền công</th>
                        <th>Tổng tiền công <br />+ phụ tùng</th>
                        <th><i className="far fa-trash-alt"></i></th>
                    </tr>

                    {props.listBillProduct && props.listBillProduct.map((item, index) => (
                        <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{item.tenphutungvacongviec}</td>
                            <td>{item.maphutung}</td>
                            <td>{item.dongia}</td>
                            <td>{item.soluongphutung}</td>
                            <td>{(item.dongia * item.soluongphutung).toLocaleString('vi-VI', { style: 'currency', currency: 'VND' })}</td>
                            <td>{item.tiencong.toLocaleString('vi-VI', { style: 'currency', currency: 'VND' })}</td>
                            <td>{item.tongtien.toLocaleString('vi-VI', { style: 'currency', currency: 'VND' })}</td>
                            <td>
                                <DelButton onClick={() => {
                                    props.deleteItemBillProduct(item.key);
                                }}>
                                    <i className="far fa-trash-alt"></i>
                                </DelButton>
                            </td>
                        </tr>

                    ))}

                </tbody>
            </Table>
            <DivFlexRow style={{ marginTop: 25, marginBottom: 5, justifyContent: 'space-between' }}>
                <label></label>
                {isUpdateBill === 0 ?
                    <Button onClick={() => { handleSaveBill(); }}>
                        Lưu
                    </Button>
                    :
                    <DivFlexRow>
                        <Button onClick={UpdateHoaDon}>
                            Update
                        </Button>
                        <Button onClick={thanhToanHoaDon}>
                            Thanh toán
                        </Button>
                        <DelButton style={{ marginLeft: 15 }} onClick={HuyHoaDon}>
                            Hủy
                        </DelButton>
                    </DivFlexRow>
                }
            </DivFlexRow>
            <PopupAccessory isShowing={isShowNewBill} onCloseClick={() => { setShowNewBill(false) }} />
            <PopupBillCHN isShowing={isShowCuaHangNgoai} listCuaHangNgoai={listCuaHangNgoai} onCloseClick={() => { setShowCuaHangNgoai(false) }} />

            <HistoryCustomer isShowing={isShowHistoryCustomer} onCloseClick={() => {
                setShowHistoryCustomer(false)
            }
            } ma={mMaKH.value && mMaKH.value !== "" ? mMaKH.value : null} />
        </div>
    )
}
const mapState = (state) => ({
    token: state.Authenticate.token,
    listBillProduct: state.Product.listBillProduct,
    info: state.Authenticate.info
})
const mapDispatch = (dispatch) => ({
    deleteBillProduct: () => { dispatch(deleteBillProduct()) },
    deleteItemBillProduct: (key) => { dispatch(deleteItemBillProduct(key)) },
    setListBillProduct: (arr) => { dispatch(setListBillProduct(arr)) },

})
export default withRouter(connect(mapState, mapDispatch)(RepairedBill));
// export default RepairedBill;